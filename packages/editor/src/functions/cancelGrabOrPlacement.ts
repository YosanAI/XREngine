import { getEntityNodeArrayFromEntities } from '@xrengine/engine/src/ecs/functions/EntityTree'
import { TransformMode } from '@xrengine/engine/src/scene/constants/transformConstants'
import { getMutableState } from '@xrengine/hyperflux'

import { accessEditorHelperState } from '../services/EditorHelperState'
import { SelectionState } from '../services/SelectionServices'
import { EditorControlFunctions } from './EditorControlFunctions'
import { setTransformMode } from './transformFunctions'

export const cancelGrabOrPlacement = () => {
  const editorHelperState = accessEditorHelperState()

  if (editorHelperState.transformMode.value === TransformMode.Grab) {
    setTransformMode(editorHelperState.transformModeOnCancel.value)
    // if (EditorHistory.grabCheckPoint) revertHistory(EditorHistory.grabCheckPoint)
  } else if (editorHelperState.transformMode.value === TransformMode.Placement) {
    setTransformMode(editorHelperState.transformModeOnCancel.value)
    EditorControlFunctions.removeObject(
      getEntityNodeArrayFromEntities(getMutableState(SelectionState).selectedEntities.value)
    )
  }
}
