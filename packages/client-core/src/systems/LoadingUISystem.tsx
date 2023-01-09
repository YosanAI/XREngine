import type { WebLayer3D } from '@etherealjs/web-layer/three'
import { useEffect } from 'react'
import { DoubleSide, Mesh, MeshBasicMaterial, SphereGeometry, Texture } from 'three'

import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { EngineActions, EngineState } from '@xrengine/engine/src/ecs/classes/EngineState'
import { World } from '@xrengine/engine/src/ecs/classes/World'
import {
  addComponent,
  getComponent,
  removeComponent,
  setComponent
} from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import { removeEntity } from '@xrengine/engine/src/ecs/functions/EntityFunctions'
import { NameComponent } from '@xrengine/engine/src/scene/components/NameComponent'
import { setVisibleComponent } from '@xrengine/engine/src/scene/components/VisibleComponent'
import { ObjectLayers } from '@xrengine/engine/src/scene/constants/ObjectLayers'
import { textureLoader } from '@xrengine/engine/src/scene/constants/Util'
import { setObjectLayers } from '@xrengine/engine/src/scene/functions/setObjectLayers'
import {
  ComputedTransformComponent,
  setComputedTransformComponent
} from '@xrengine/engine/src/transform/components/ComputedTransformComponent'
import { XRUIComponent } from '@xrengine/engine/src/xrui/components/XRUIComponent'
import { createTransitionState } from '@xrengine/engine/src/xrui/functions/createTransitionState'
import { ObjectFitFunctions } from '@xrengine/engine/src/xrui/functions/ObjectFitFunctions'
import { createActionQueue, getState, removeActionQueue, startReactor, useHookstate } from '@xrengine/hyperflux'

import { AppLoadingState, AppLoadingStates, useLoadingState } from '../common/services/AppLoadingService'
import { SceneActions } from '../world/services/SceneService'
import { LoadingSystemState } from './state/LoadingState'
import { createLoaderDetailView } from './ui/LoadingDetailView'

export default async function LoadingUISystem(world: World) {
  const transitionPeriodSeconds = 1
  const transition = createTransitionState(transitionPeriodSeconds, 'IN')

  const ui = createLoaderDetailView(transition)

  addComponent(ui.entity, NameComponent, 'Loading XRUI')

  const mesh = new Mesh(
    new SphereGeometry(10),
    new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite: true, depthTest: false })
  )
  mesh.visible = false

  // flip inside out
  mesh.scale.set(-1, 1, 1)
  mesh.renderOrder = 1
  Engine.instance.currentWorld.camera.add(mesh)

  setObjectLayers(mesh, ObjectLayers.UI)

  const currentSceneChangedQueue = createActionQueue(SceneActions.currentSceneChanged.matches)
  const avatarModelChangedQueue = createActionQueue(EngineActions.avatarModelChanged.matches)
  const spectateUserQueue = createActionQueue(EngineActions.spectateUser.matches)

  const appLoadingState = getState(AppLoadingState)
  const engineState = getState(EngineState)

  const reactor = startReactor(() => {
    const loadingState = useHookstate(appLoadingState)

    useEffect(() => {
      if (loadingState.state.value === AppLoadingStates.SCENE_LOADING) {
        transition.setState('IN')
      }
    }, [loadingState.state])

    return null
  })

  const execute = () => {
    for (const action of currentSceneChangedQueue()) {
      const thumbnailUrl = action.sceneData.thumbnailUrl.replace('thumbnail.jpeg', 'envmap.png')
      if (thumbnailUrl && mesh.userData.url !== thumbnailUrl) {
        mesh.userData.url = thumbnailUrl
        textureLoader.load(thumbnailUrl, (texture) => {
          if (texture) mesh.material.map = texture!
          mesh.visible = true
        })
      }
    }

    for (const action of spectateUserQueue()) {
      if (appLoadingState.state.value === AppLoadingStates.SUCCESS && engineState.sceneLoaded.value)
        transition.setState('OUT')
    }

    for (const action of avatarModelChangedQueue()) {
      if (
        (action.entity === world.localClientEntity || engineState.spectating.value) &&
        appLoadingState.state.value === AppLoadingStates.SUCCESS &&
        engineState.sceneLoaded.value
      )
        transition.setState('OUT')
    }
    if (transition.state === 'OUT' && transition.alpha === 0) {
      removeComponent(ui.entity, ComputedTransformComponent)
      return
    }

    const xrui = getComponent(ui.entity, XRUIComponent)

    if (transition.state === 'IN' && transition.alpha === 1) {
      setComputedTransformComponent(ui.entity, world.cameraEntity, () => {
        const distance = 0.1
        const ppu = xrui.options.manager.pixelsPerMeter
        const contentWidth = ui.state.imageWidth.value / ppu
        const contentHeight = ui.state.imageHeight.value / ppu
        const scale = ObjectFitFunctions.computeContentFitScaleForCamera(distance, contentWidth, contentHeight, 'cover')
        ObjectFitFunctions.attachObjectInFrontOfCamera(ui.entity, scale, distance)
      })
    }

    mesh.quaternion.copy(Engine.instance.currentWorld.camera.quaternion).invert()

    // add a slow rotation to animate on desktop, otherwise just keep it static for VR
    // if (!getEngineState().joinedWorld.value) {
    //   Engine.instance.currentWorld.camera.rotateY(world.delta * 0.35)
    // } else {
    //   // todo: figure out how to make this work properly for VR #7256
    // }

    const loadingState = getState(LoadingSystemState).loadingScreenOpacity

    transition.update(world.deltaSeconds, (opacity) => {
      if (opacity !== loadingState.value) loadingState.set(opacity)
      mesh.material.opacity = opacity
      mesh.visible = opacity > 0
      xrui.rootLayer.traverseLayersPreOrder((layer: WebLayer3D) => {
        const mat = layer.contentMesh.material as MeshBasicMaterial
        mat.opacity = opacity
        mat.visible = opacity > 0
        layer.visible = opacity > 0
      })
      if (opacity < 0.001) setVisibleComponent(ui.entity, false)
    })
  }

  const cleanup = async () => {
    removeActionQueue(currentSceneChangedQueue)
    removeActionQueue(avatarModelChangedQueue)
    removeActionQueue(spectateUserQueue)
    removeEntity(ui.entity)
    mesh.removeFromParent()
    reactor.stop()
  }

  return { execute, cleanup }
}
