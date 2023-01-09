import { createHookableFunction } from '@xrengine/common/src/utils/createHookableFunction'
import { dispatchAction, getMutableState, none } from '@xrengine/hyperflux'

import { AvatarHeadDecapComponent } from '../avatar/components/AvatarIKComponents'
import { FollowCameraComponent } from '../camera/components/FollowCameraComponent'
import { ButtonInputStateType, createInitialButtonState } from '../input/InputState'
import { SkyboxComponent } from '../scene/components/SkyboxComponent'
import { setVisibleComponent } from '../scene/components/VisibleComponent'
import { updateSkybox } from '../scene/functions/loaders/SkyboxFunctions'
import { matches } from './../common/functions/MatchesUtils'
import { Engine } from './../ecs/classes/Engine'
import { addComponent, defineQuery, getComponent, hasComponent } from './../ecs/functions/ComponentFunctions'
import { removeComponent } from './../ecs/functions/ComponentFunctions'
import { EngineRenderer } from './../renderer/WebGLRendererSystem'
import { getControlMode, XRAction, XRState } from './XRState'

const skyboxQuery = defineQuery([SkyboxComponent])

/**
 * A hookable function that is fired when the XR Session is requested
 * @returns
 */
export const requestXRSession = createHookableFunction(
  async (action: typeof XRAction.requestSession.matches._TYPE): Promise<void> => {
    const xrState = getMutableState(XRState)
    const xrManager = EngineRenderer.instance.xrManager

    if (xrState.requestingSession.value || xrState.sessionActive.value) return
    try {
      const sessionInit = {
        optionalFeatures: [
          'local-floor',
          'hand-tracking',
          'layers',
          'dom-overlay',
          'hit-test',
          'light-estimation',
          'depth-sensing',
          'anchors',
          'plane-detection'
        ],
        depthSensing: {
          usagePreference: ['cpu-optimized', 'gpu-optimized'],
          dataFormatPreference: ['luminance-alpha', 'float32']
        },
        domOverlay: { root: document.body }
      } as XRSessionInit
      const mode =
        action.mode ||
        (xrState.supportedSessionModes['immersive-ar'].value
          ? 'immersive-ar'
          : xrState.supportedSessionModes['immersive-vr'].value
          ? 'immersive-vr'
          : 'inline')

      xrState.requestingSession.set(true)
      const xrSession = (EngineRenderer.instance.xrSession = await navigator.xr!.requestSession(mode, sessionInit))

      // @ts-ignore
      if (xrSession.interactionMode === 'screen-space' && xrSession.domOverlayState?.type === 'screen') {
        xrManager.setFramebufferScaleFactor(0.5)
      } else {
        xrManager.setFramebufferScaleFactor(1.2)
      }

      await xrManager.setSession(xrSession)

      xrState.sessionActive.set(true)

      const referenceSpace = xrManager.getReferenceSpace()
      xrState.originReferenceSpace.set(referenceSpace)

      xrManager.setFoveation(1)
      xrState.sessionMode.set(mode)

      const world = Engine.instance.currentWorld

      if (mode === 'immersive-ar') setupARSession(world)
      if (mode === 'immersive-vr') setupVRSession(world)

      const prevFollowCamera = getComponent(world.cameraEntity, FollowCameraComponent)
      removeComponent(world.cameraEntity, FollowCameraComponent)
      if (mode === 'immersive-ar') setVisibleComponent(world.localClientEntity, false)

      const onSessionEnd = () => {
        xrState.sessionActive.set(false)
        xrState.sessionMode.set('none')
        xrManager.removeEventListener('sessionend', onSessionEnd)
        xrManager.setSession(null!)
        EngineRenderer.instance.xrSession = null!
        const world = Engine.instance.currentWorld
        addComponent(world.cameraEntity, FollowCameraComponent, prevFollowCamera)
        EngineRenderer.instance.renderer.domElement.style.display = ''
        setVisibleComponent(world.localClientEntity, true)

        xrState.originReferenceSpace.set(null)
        xrState.viewerReferenceSpace.set(null)

        const skybox = skyboxQuery()[0]
        if (skybox) updateSkybox(skybox)
        dispatchAction(XRAction.sessionChanged({ active: false }))
      }
      xrManager.addEventListener('sessionend', onSessionEnd)

      dispatchAction(XRAction.sessionChanged({ active: true }))
    } catch (e) {
      console.error('Failed to create XR Session', e)
    }

    xrState.requestingSession.set(false)
  }
)

/**
 * A hookable function that is fired when the XR Session has ended
 * @returns
 */
export const endXRSession = createHookableFunction(async () => {
  await EngineRenderer.instance.xrSession?.end()
})

/**
 * A hookable function that is fired when the XR Session has changed
 * @returns
 */
export const xrSessionChanged = createHookableFunction((action: typeof XRAction.sessionChanged.matches._TYPE) => {
  const entity = Engine.instance.currentWorld.getUserAvatarEntity(action.$from)
  if (!entity) return

  if (action.active) {
    if (getControlMode() === 'attached') {
      if (!hasComponent(entity, AvatarHeadDecapComponent)) addComponent(entity, AvatarHeadDecapComponent, true)
    }
  }
})

export const setupVRSession = (world = Engine.instance.currentWorld) => {}

export const setupARSession = (world = Engine.instance.currentWorld) => {
  EngineRenderer.instance.renderer.domElement.style.display = 'none'

  /**
   * AR uses the `select` event as taps on the screen for mobile AR sessions
   * This gets piped into the input system as a TouchInput.Touch
   */
  EngineRenderer.instance.xrSession.addEventListener('selectstart', () => {
    ;(world.buttons as ButtonInputStateType).PrimaryClick = createInitialButtonState()
  })
  EngineRenderer.instance.xrSession.addEventListener('selectend', (inputSource) => {
    ;(world.buttons as ButtonInputStateType).PrimaryClick!.up = true
  })

  world.scene.background = null
}
