import { Object3D } from 'three'

import { AssetLoader } from '@xrengine/engine/src/assets/classes/AssetLoader'
import { AssetType } from '@xrengine/engine/src/assets/enum/AssetType'
import {
  ComponentDeserializeFunction,
  ComponentSerializeFunction
} from '@xrengine/engine/src/common/constants/PrefabFunctionType'
import { Entity } from '@xrengine/engine/src/ecs/classes/Entity'
import {
  addComponent,
  getComponent,
  getComponentState,
  hasComponent,
  removeComponent,
  setComponent,
  useComponent
} from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import {
  EntityTreeNode,
  iterateEntityNode,
  removeEntityNodeFromParent
} from '@xrengine/engine/src/ecs/functions/EntityTree'
import { LoadState, PrefabComponent, PrefabComponentType } from '@xrengine/engine/src/scene/components/PrefabComponent'

import { Engine } from '../../../ecs/classes/Engine'
import { removeEntity } from '../../../ecs/functions/EntityFunctions'

export const unloadPrefab = (entity: Entity) => {
  if (!hasComponent(entity, PrefabComponent)) {
    console.warn('no Prefab component')
  } else {
    const prefabComponent = getComponent(entity, PrefabComponent)
    if (prefabComponent.loaded !== LoadState.LOADED) {
      console.warn('prefab', prefabComponent, 'is not in loaded state')
    }
    prefabComponent.roots.map((node) => {
      if (node) {
        const children = new Array()
        iterateEntityNode(node, (child, idx) => {
          children.push(child)
        })
        children.forEach((child) => {
          removeEntityNodeFromParent(child)
          removeEntity(child.entity)
        })
      }
    })
    if (hasComponent(entity, PrefabComponent)) {
      const prefab = getComponentState(entity, PrefabComponent)
      prefab.loaded.set(LoadState.UNLOADED)
      prefab.roots.set([])
    }
  }
}

export const loadPrefab = async (entity: Entity, loader = AssetLoader) => {
  const prefab = getComponent(entity, PrefabComponent)
  const prefabState = getComponentState(entity, PrefabComponent)
  //check if asset is already loading or loaded
  if (prefab.loaded !== LoadState.UNLOADED) {
    console.warn('Asset', prefab, 'is not unloaded')
    return
  }
  if (loader.getAssetType(prefab.src) !== AssetType.XRE) {
    throw Error('only .xre.gltf files currently supported')
  }
  try {
    prefabState.loaded.set(LoadState.LOADING)
    const result = (await loader.loadAsync(prefab.src, {
      assetRoot: Engine.instance.currentWorld.entityTree.entityNodeMap.get(entity)!
    })) as EntityTreeNode[]
    prefabState.roots.set(result)
    prefabState.loaded.set(LoadState.LOADED)
  } catch (e) {
    prefabState.loaded.set(LoadState.UNLOADED)
    throw e
  }
}

export const deserializePrefab: ComponentDeserializeFunction = async (entity: Entity, data: PrefabComponentType) => {
  setComponent(entity, PrefabComponent, data)
  if (data.loaded === LoadState.LOADED) {
    getComponentState(entity, PrefabComponent).loaded.set(LoadState.UNLOADED)
    await loadPrefab(entity)
  }
}
