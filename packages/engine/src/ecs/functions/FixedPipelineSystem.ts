import { getMutableState } from '@xrengine/hyperflux'

import { nowMilliseconds } from '../../common/functions/nowMilliseconds'
import { EngineState } from '../classes/EngineState'
import { World } from '../classes/World'
import { SystemUpdateType } from './SystemUpdateType'

// const logger = multiLogger.child({ component: 'engine:ecs:FixedPipelineSystem' })
/**
 * System for running simulation logic with fixed time intervals
 */
export default function FixedPipelineSystem(world: World) {
  // const maxIterations = 1

  const execute = () => {
    const start = nowMilliseconds()
    let timeUsed = 0

    let accumulator = world.elapsedSeconds - world.fixedElapsedSeconds

    const engineState = getMutableState(EngineState)

    const timestep = engineState.fixedDeltaSeconds.value
    const maxMilliseconds = 8

    // If the difference between fixedElapsedTime and elapsedTime becomes too large,
    // we should simply skip ahead.
    const maxFixedFrameDelay = Math.max(1, world.deltaSeconds / timestep)

    if (accumulator < 0) {
      engineState.fixedTick.set(Math.floor(engineState.elapsedSeconds.value / timestep))
      engineState.fixedElapsedSeconds.set(engineState.fixedTick.value * timestep)
    }

    let accumulatorDepleted = accumulator < timestep
    let timeout = timeUsed > maxMilliseconds
    let updatesLimitReached = false

    while (!accumulatorDepleted && !timeout && !updatesLimitReached) {
      engineState.fixedTick.set(engineState.fixedTick.value + 1)
      engineState.fixedElapsedSeconds.set(engineState.fixedTick.value * timestep)

      for (const s of world.pipelines[SystemUpdateType.FIXED_EARLY]) s.enabled && s.execute()
      for (const s of world.pipelines[SystemUpdateType.FIXED]) s.enabled && s.execute()
      for (const s of world.pipelines[SystemUpdateType.FIXED_LATE]) s.enabled && s.execute()

      accumulator -= timestep

      const frameDelay = accumulator / timestep

      timeUsed = nowMilliseconds() - start
      accumulatorDepleted = accumulator < timestep
      timeout = timeUsed > maxMilliseconds

      if (frameDelay >= maxFixedFrameDelay) {
        engineState.fixedTick.set(Math.floor(engineState.elapsedSeconds.value / timestep))
        engineState.fixedElapsedSeconds.set(engineState.fixedTick.value * timestep)
        break
      }
    }
  }

  const cleanup = async () => {}

  return { execute, cleanup }
}
