import { getMutableState } from '@xrengine/hyperflux'

import { ComponentDeserializeFunction } from '../../../common/constants/PrefabFunctionType'
import { EngineState } from '../../../ecs/classes/EngineState'
import { Entity } from '../../../ecs/classes/Entity'
import { setComponent } from '../../../ecs/functions/ComponentFunctions'
import { ModelComponent } from '../../components/ModelComponent'
import { SceneAssetPendingTagComponent } from '../../components/SceneAssetPendingTagComponent'

export const deserializeModel: ComponentDeserializeFunction = (
  entity: Entity,
  data: ReturnType<typeof ModelComponent.toJSON>
) => {
  setComponent(entity, ModelComponent, data)
  /**
   * Add SceneAssetPendingTagComponent to tell scene loading system we should wait for this asset to load
   */
  if (!getMutableState(EngineState).sceneLoaded.value) setComponent(entity, SceneAssetPendingTagComponent, true)
}
