import { useEffect } from 'react'
import {
  Color,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial
} from 'three'

import { getMutableState } from '@xrengine/hyperflux'

import { loadDRACODecoder } from '../../assets/loaders/gltf/NodeDracoLoader'
import { isNode } from '../../common/functions/getEnvironment'
import { isClient } from '../../common/functions/isClient'
import { isHMD } from '../../common/functions/isMobile'
import { Engine } from '../../ecs/classes/Engine'
import { EngineState } from '../../ecs/classes/EngineState'
import { Entity } from '../../ecs/classes/Entity'
import { World } from '../../ecs/classes/World'
import {
  defineQuery,
  getComponent,
  hasComponent,
  removeQuery,
  useOptionalComponent
} from '../../ecs/functions/ComponentFunctions'
import { EngineRenderer } from '../../renderer/WebGLRendererSystem'
import { DistanceFromCameraComponent, FrustumCullCameraComponent } from '../../transform/components/DistanceComponents'
import { CallbackComponent } from '../components/CallbackComponent'
import { GroupComponent, Object3DWithEntity, startGroupQueryReactor } from '../components/GroupComponent'
import { ShadowComponent } from '../components/ShadowComponent'
import { UpdatableCallback, UpdatableComponent } from '../components/UpdatableComponent'
import { VisibleComponent } from '../components/VisibleComponent'
import FogSystem from './FogSystem'
import ShadowSystem from './ShadowSystem'

export const ExpensiveMaterials = new Set([MeshPhongMaterial, MeshStandardMaterial, MeshPhysicalMaterial])

/** @todo reimplement BPCEM */
const applyBPCEM = (material) => {
  // SceneOptions needs to be replaced with a proper state
  // if (!material.userData.hasBoxProjectionApplied && SceneOptions.instance.boxProjection) {
  //   addOBCPlugin(
  //     material,
  //     beforeMaterialCompile(
  //       SceneOptions.instance.bpcemOptions.bakeScale,
  //       SceneOptions.instance.bpcemOptions.bakePositionOffset
  //     )
  //   )
  //   material.userData.hasBoxProjectionApplied = true
  // }
}

export function setupObject(obj: Object3DWithEntity) {
  const mesh = obj as any as Mesh<any, any>
  mesh.traverse((child: Mesh<any, any>) => {
    if (child.material) {
      if (isHMD && ExpensiveMaterials.has(child.material.constructor)) {
        const prevMaterial = child.material
        const onlyEmmisive = prevMaterial.emissiveMap && !prevMaterial.map
        prevMaterial.dispose()
        child.material = new MeshBasicMaterial().copy(prevMaterial)
        child.material.color = onlyEmmisive ? new Color('white') : prevMaterial.color
        child.material.map = prevMaterial.map ?? prevMaterial.emissiveMap

        // todo: find out why leaving the envMap makes basic & lambert materials transparent here
        child.material.envMap = null
      }
      child.material.dithering = true
    }
  })
}

export default async function SceneObjectSystem(world: World) {
  if (isNode) {
    await loadDRACODecoder()
  }

  const groupQuery = defineQuery([GroupComponent])
  const updatableQuery = defineQuery([GroupComponent, UpdatableComponent, CallbackComponent])

  function GroupChildReactor(props: { entity: Entity; obj: Object3DWithEntity }) {
    const { entity, obj } = props

    const shadowComponent = useOptionalComponent(entity, ShadowComponent)

    useEffect(() => {
      setupObject(obj)
      return () => {
        const layers = Object.values(Engine.instance.currentWorld.objectLayerList)
        for (const layer of layers) {
          if (layer.has(obj)) layer.delete(obj)
        }
      }
    }, [])

    useEffect(() => {
      const shadow = shadowComponent?.value
      obj.traverse((child: Mesh<any, Material>) => {
        if (child.material) {
          child.castShadow = !!shadow?.cast
          child.receiveShadow = !!shadow?.receive
          if (child.receiveShadow) {
            /** @todo store this somewhere such that if the CSM is destroyed and recreated it can set up the materials automatically */
            EngineRenderer.instance.csm?.setupMaterial(child)
          }
        }
      })
    }, [shadowComponent])

    return null
  }

  /**
   * Group Reactor - responds to any changes in the
   */
  const groupReactor = startGroupQueryReactor(GroupChildReactor)

  const minimumFrustumCullDistanceSqr = 5 * 5 // 5 units

  const execute = () => {
    const delta = getMutableState(EngineState).deltaSeconds.value
    for (const entity of updatableQuery()) {
      const callbacks = getComponent(entity, CallbackComponent)
      callbacks.get(UpdatableCallback)?.(delta)
    }

    for (const entity of groupQuery()) {
      const group = getComponent(entity, GroupComponent)
      /**
       * do frustum culling here, but only if the object is more than 5 units away
       */
      const visible =
        hasComponent(entity, VisibleComponent) &&
        !(
          FrustumCullCameraComponent.isCulled[entity] &&
          DistanceFromCameraComponent.squaredDistance[entity] > minimumFrustumCullDistanceSqr
        )
      for (const obj of group) obj.visible = visible
    }
  }

  const cleanup = async () => {
    removeQuery(world, groupQuery)
    removeQuery(world, updatableQuery)
    groupReactor.stop()
  }

  const subsystems = [() => Promise.resolve({ default: FogSystem })]
  if (isClient) subsystems.push(() => Promise.resolve({ default: ShadowSystem }))

  return {
    execute,
    cleanup,
    subsystems
  }
}
