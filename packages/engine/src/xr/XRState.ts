import matches, { Validator } from 'ts-matches'

import { defineAction, defineState, getState, syncStateWithLocalStorage, useHookstate } from '@xrengine/hyperflux'

import { AvatarInputSettingsState } from '../avatar/state/AvatarInputSettingsState'
import { isMobile } from '../common/functions/isMobile'
import { Entity } from '../ecs/classes/Entity'
import { DepthDataTexture } from './DepthDataTexture'
import { XREstimatedLight } from './XREstimatedLight'

// TODO: divide this up into the systems that manage these states
export const XRState = defineState({
  name: 'XRState',
  initial: () => ({
    sessionActive: false,
    requestingSession: false,
    scenePlacementMode: null as XRInputSource | null,
    supportedSessionModes: {
      inline: false,
      'immersive-ar': false,
      'immersive-vr': false
    },
    session: null as XRSession | null,
    sessionMode: 'none' as 'inline' | 'immersive-ar' | 'immersive-vr' | 'none',
    /**
     * The `avatarCameraMode` property can be 'auto', 'attached', or 'detached'.
     * When `avatarCameraMode` is 'attached' the avatar's head is attached to the XR display.
     * When `avatarCameraMode` is 'detached' the avatar can move freely via movement controls (e.g., joystick).
     * When `avatarCameraMode` is 'auto', the avatar will switch between these modes automtically based on the current XR session mode and other heursitics.
     */
    dollhouseMode: 'auto' as 'auto' | 'on' | 'off',
    sceneScale: 1,
    avatarCameraMode: 'auto' as 'auto' | 'attached' | 'detached',
    viewerHitTestSource: null as XRHitTestSource | null,
    viewerHitTestEntity: 0 as Entity,
    sceneRotationOffset: 0,
    /** Stores the depth map data - will exist if depth map is supported */
    depthDataTexture: null as DepthDataTexture | null,
    is8thWallActive: false,
    isEstimatingLight: false,
    lightEstimator: null! as XREstimatedLight,
    viewerInputSourceEntity: 0 as Entity,
    viewerPose: null as XRViewerPose | null | undefined,
    userEyeLevel: 1.8
  }),
  onCreate: (store, state) => {
    syncStateWithLocalStorage(XRState, [
      /** @todo replace this wither user_settings table entry */
      'userEyeLevel'
    ])
  }
})

export const ReferenceSpace = {
  /**
   * The scene origin reference space describes where the origin of the tracking space is
   */
  origin: null as XRReferenceSpace | null,
  /**
   * @see https://www.w3.org/TR/webxr/#dom-xrreferencespacetype-local-floor
   */
  localFloor: null as XRReferenceSpace | null,
  /**
   * @see https://www.w3.org/TR/webxr/#dom-xrreferencespacetype-viewer
   */
  viewer: null as XRReferenceSpace | null
}

export const XRReceptors = {
  scenePlacementMode: (action: ReturnType<typeof XRAction.changePlacementMode>) => {
    getState(XRState).scenePlacementMode.set(action.inputSource)
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
    inputSource: matches.object.optional() as Validator<unknown, XRInputSource | null>
  })

  // todo, support more haptic formats other than just vibrating controllers
  static vibrateController = defineAction({
    type: 'xre.xr.vibrateController',
    handedness: matches.literals('left', 'right'),
    value: matches.number,
    duration: matches.number
  })
}

export const getCameraMode = () => {
  const { avatarCameraMode, sessionActive, sceneScale, scenePlacementMode } = getState(XRState).value
  if (!sessionActive) return 'detached'
  if (avatarCameraMode === 'auto') {
    return sceneScale !== 1 || scenePlacementMode ? 'detached' : 'attached'
  }
  return avatarCameraMode
}

export const hasMovementControls = () => {
  const { sessionActive, sceneScale, sessionMode } = getState(XRState).value
  if (!sessionActive) return true
  return sessionMode === 'immersive-ar' ? sceneScale !== 1 : true
}

/**
 * Gets the preferred controller entity - will return null if the entity is not in an active session or the controller is not available
 * @param {boolean} offhand specifies to return the non-preferred hand instead
 * @returns {Entity}
 */
export const getPreferredInputSource = (inputSources: XRInputSourceArray, offhand = false) => {
  const xrState = getState(XRState)
  if (!xrState.sessionActive.value) return
  const avatarInputSettings = getState(AvatarInputSettingsState)
  for (const inputSource of inputSources) {
    if (inputSource.handedness === 'none') continue
    if (!offhand && avatarInputSettings.preferredHand.value == inputSource.handedness) return inputSource
    if (offhand && avatarInputSettings.preferredHand.value !== inputSource.handedness) return inputSource
  }
}

/** Detect HMDs via the presence of the XR module in the navigator and not the WebXR Emulator */
export const isHeadset = () => {
  const supportedSessionModes = getState(XRState).supportedSessionModes
  if (isMobile || typeof globalThis.CustomWebXRPolyfill !== 'undefined') return false
  return supportedSessionModes['immersive-vr'].value || supportedSessionModes['immersive-ar'].value
}

export const useIsHeadset = () => {
  const supportedSessionModes = useHookstate(getState(XRState).supportedSessionModes)
  if (isMobile || typeof globalThis.CustomWebXRPolyfill !== 'undefined') return false
  return supportedSessionModes['immersive-vr'].value || supportedSessionModes['immersive-ar'].value
}
