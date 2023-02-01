import React from 'react'

import { TouchGamepad } from '@xrengine/client-core/src/common/components/TouchGamepad'
import { UserMenu } from '@xrengine/client-core/src/user/components/UserMenu'
import { iOS } from '@xrengine/engine/src/common/functions/isMobile'
import { EngineState } from '@xrengine/engine/src/ecs/classes/EngineState'
import { getCameraMode, XRState } from '@xrengine/engine/src/xr/XRState'
import { getState, useHookstate } from '@xrengine/hyperflux'

import { LoadingSystemState } from '../../systems/state/LoadingState'
import { ARPlacement } from '../ARPlacement'
import { Fullscreen } from '../Fullscreen'
import { InstanceChatWrapper } from '../InstanceChat'
import { MediaIconsBox } from '../MediaIconsBox'
import { Shelves } from '../Shelves'
import { UserMediaWindows } from '../UserMediaWindows'
import { XRLoading } from '../XRLoading'
import styles from './index.module.scss'

export const LocationIcons = () => {
  const loadingSystemState = useHookstate(getState(LoadingSystemState))
  const engineState = useHookstate(getState(EngineState))
  useHookstate(getState(XRState))
  const cameraMode = getCameraMode()

  if (!engineState.isEngineInitialized.value) return <></>
  return (
    <>
      <UserMenu />
      {/** Container for fading most stuff in and out depending on if the location is loaded or not  */}
      <div style={{ opacity: 1 - loadingSystemState.loadingScreenOpacity.value }}>
        <div className={`${styles.rightSidebar}`}>
          <UserMediaWindows />
          <InstanceChatWrapper />
        </div>
        <Shelves />
        <ARPlacement />
        <XRLoading />
        <MediaIconsBox />
        {cameraMode === 'detached' && <TouchGamepad />}
        {!iOS && <Fullscreen />}
      </div>
    </>
  )
}
