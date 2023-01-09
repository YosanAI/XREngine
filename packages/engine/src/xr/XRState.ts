import matches from 'ts-matches'

import { defineState, getMutableState } from '@xrengine/hyperflux'
import { defineAction } from '@xrengine/hyperflux'

import { AvatarInputSettingsState } from '../avatar/state/AvatarInputSettingsState'
import { isHMD } from '../common/functions/isMobile'
import { Entity } from '../ecs/classes/Entity'
import { DepthDataTexture } from './DepthDataTexture'
import { XREstimatedLight } from './XREstimatedLight'

export const XRState = defineState({
  name: 'XRState',
  initial: () => ({
    sessionActive: false,
    requestingSession: false,
    scenePlacementMode: false,
    supportedSessionModes: {
      inline: false,
      'immersive-ar': false,
      'immersive-vr': false
    },
    sessionMode: 'none' as 'inline' | 'immersive-ar' | 'immersive-vr' | 'none',
    /**
     * The `avatarControlMode` property can be 'auto', 'attached', or 'detached'.
     * When `avatarControlMode` is 'attached' the avatar's head is attached to the XR display.
     * When `avatarControlMode` is 'detached' the avatar can move freely via movement controls (e.g., joystick).
     * When `avatarControlMode` is 'auto', the avatar will switch between these modes automtically based on the current XR session mode and other heursitics.
     */
    avatarControlMode: 'auto' as 'auto' | 'attached' | 'detached',
    avatarHeadLock: 'auto' as 'auto' | true | false,
    /** origin is always 0,0,0 */
    originReferenceSpace: null as XRReferenceSpace | null,
    viewerReferenceSpace: null as XRReferenceSpace | null,
    viewerHitTestSource: null as XRHitTestSource | null,
    viewerHitTestEntity: 0 as Entity,
    sceneRotationOffset: 0,
    /** Stores the depth map data - will exist if depth map is supported */
    depthDataTexture: null as DepthDataTexture | null,
    is8thWallActive: false,
    isEstimatingLight: false,
    lightEstimator: null! as XREstimatedLight,
    viewerInputSourceEntity: 0 as Entity
  })
})

export const XRReceptors = {
  scenePlacementMode: (action: ReturnType<typeof XRAction.changePlacementMode>) => {
    getMutableState(XRState).scenePlacementMode.set(action.active)
  }
}

export class XRAction {
  static requestSession = defineAction({
    type: 'xre.xr.requestSession' as const,
    mode: matches.literals('inline', 'immersive-ar', 'immersive-vr').optional()
  })

  static endSession = defineAction({
    type: 'xre.xr.endSession' as const
  })

  static sessionChanged = defineAction({
    type: 'xre.xr.sessionChanged' as const,
    active: matches.boolean,
    $cache: { removePrevious: true }
  })

  static changePlacementMode = defineAction({
    type: 'xre.xr.changePlacementMode',
    active: matches.boolean
  })

  // todo, support more haptic formats other than just vibrating controllers
  static vibrateController = defineAction({
    type: 'xre.xr.vibrateController',
    handedness: matches.literals('left', 'right'),
    value: matches.number,
    duration: matches.number
  })
}

export const getControlMode = () => {
  const { avatarControlMode, sessionMode, sessionActive } = getMutableState(XRState).value
  if (!sessionActive) return 'none'
  if (avatarControlMode === 'auto') {
    return sessionMode === 'immersive-vr' || sessionMode === 'inline' || isHMD ? 'attached' : 'detached'
  }
  return avatarControlMode
}

export const getAvatarHeadLock = () => {
  const { avatarHeadLock } = getMutableState(XRState)
  return avatarHeadLock.value === 'auto' ? false : avatarHeadLock.value
}

/**
 * Gets the preferred controller entity - will return null if the entity is not in an active session or the controller is not available
 * @param {boolean} offhand specifies to return the non-preferred hand instead
 * @returns {Entity}
 */
export const getPreferredInputSource = (inputSources: XRInputSourceArray, offhand = false) => {
  const xrState = getMutableState(XRState)
  if (!xrState.sessionActive.value) return
  const avatarInputSettings = getMutableState(AvatarInputSettingsState)
  for (const inputSource of inputSources) {
    if (inputSource.handedness === 'none') continue
    if (!offhand && avatarInputSettings.preferredHand.value == inputSource.handedness) return inputSource
    if (offhand && avatarInputSettings.preferredHand.value !== inputSource.handedness) return inputSource
  }
}
