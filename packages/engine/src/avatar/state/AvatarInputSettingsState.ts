import { matches, Validator } from '@xrengine/engine/src/common/functions/MatchesUtils'
import { XR_FOLLOW_MODE, XR_ROTATION_MODE } from '@xrengine/engine/src/xr/XRUserSettings'
import {
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  syncStateWithLocalStorage,
  useState
} from '@xrengine/hyperflux'

export const AvatarMovementScheme = {
  Linear: 'AvatarMovementScheme_Linear' as const,
  Teleport: 'AvatarMovementScheme_Teleport' as const
}

export const AvatarControllerType = {
  None: 'AvatarControllerType_None' as const,
  XRHands: 'AvatarControllerType_XRHands' as const,
  OculusQuest: 'AvatarControllerType_OculusQuest' as const
}

export const AvatarInputSettingsState = defineState({
  name: 'AvatarInputSettingsState',
  initial: () => ({
    controlType: AvatarControllerType.None as typeof AvatarControllerType[keyof typeof AvatarControllerType],
    controlScheme: AvatarMovementScheme.Linear as typeof AvatarMovementScheme[keyof typeof AvatarMovementScheme],
    preferredHand: 'right' as 'left' | 'right',
    invertRotationAndMoveSticks: true,
    // TODO: implement the following
    moving: XR_FOLLOW_MODE.CONTROLLER as XR_FOLLOW_MODE,
    // rotation mode
    rotation: XR_ROTATION_MODE.ANGLED as XR_ROTATION_MODE,
    // 0.1, 0.3, 0.5, 0.8, 1
    rotationSmoothSpeed: 0.1,
    // 15, 30, 45, 60
    rotationAngle: 30,
    rotationInvertAxes: true,
    showAvatar: true
  }),
  onCreate: (store, state) => {
    syncStateWithLocalStorage(AvatarInputSettingsState, [
      'controlType',
      'controlScheme',
      'preferredHand',
      'invertRotationAndMoveSticks',
      'moving',
      'rotation',
      'rotationSmoothSpeed',
      'rotationAngle',
      'rotationInvertAxes',
      'showAvatar'
    ])
  }
})

export function AvatarInputSettingsReceptor(action) {
  const s = getMutableState(AvatarInputSettingsState)
  matches(action)
    .when(AvatarInputSettingsAction.setControlType.matches, (action) => {
      return s.merge({ controlType: action.controlType })
    })
    .when(AvatarInputSettingsAction.setControlScheme.matches, (action) => {
      return s.merge({ controlScheme: action.scheme })
    })
    .when(AvatarInputSettingsAction.setPreferredHand.matches, (action) => {
      return s.merge({ preferredHand: action.handdedness })
    })
    .when(AvatarInputSettingsAction.setInvertRotationAndMoveSticks.matches, (action) => {
      return s.merge({ invertRotationAndMoveSticks: action.invertRotationAndMoveSticks })
    })
    .when(AvatarInputSettingsAction.setShowAvatar.matches, (action) => {
      return s.merge({ showAvatar: action.showAvatar })
    })
}

export class AvatarInputSettingsAction {
  static setControlType = defineAction({
    type: 'xre.avatar.AvatarInputSettings.AVATAR_SET_CONTROL_TYPE' as const,
    controlType: matches.string as Validator<unknown, typeof AvatarControllerType[keyof typeof AvatarControllerType]>
  })

  static setControlScheme = defineAction({
    type: 'xre.avatar.AvatarInputSettings.AVATAR_SET_CONTROL_SCHEME' as const,
    scheme: matches.string as Validator<unknown, typeof AvatarMovementScheme[keyof typeof AvatarMovementScheme]>
  })

  static setPreferredHand = defineAction({
    type: 'xre.avatar.AvatarInputSettings.AVATAR_SET_PREFERRED_HAND' as const,
    handdedness: matches.string as Validator<unknown, 'left' | 'right'>
  })

  static setInvertRotationAndMoveSticks = defineAction({
    type: 'xre.avatar.AvatarInputSettings.SET_INVERT_ROTATION_AND_MOVE_STICKS' as const,
    invertRotationAndMoveSticks: matches.boolean
  })

  static setShowAvatar = defineAction({
    type: 'xre.avatar.AvatarInputSettings.SET_SHOW_AVATAR' as const,
    showAvatar: matches.boolean
  })
}
