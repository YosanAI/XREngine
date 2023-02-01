import { Engine } from '../ecs/classes/Engine'
import { World } from '../ecs/classes/World'
import { ReferenceSpace } from './XRState'

export default async function XRInputSourceSystem(world: World) {
  const targetRaySpace = {} as XRSpace

  const screenInputSource = {
    handedness: 'none',
    targetRayMode: 'screen',
    get targetRaySpace() {
      if (Engine.instance.xrFrame) {
        return ReferenceSpace.viewer!
      }
      return targetRaySpace
    },
    gripSpace: undefined,
    gamepad: {
      axes: new Array(2).fill(0),
      buttons: [],
      connected: true,
      hapticActuators: [],
      id: '',
      index: 0,
      mapping: 'xr-standard',
      timestamp: Date.now()
    },
    profiles: [],
    hand: undefined
  }
  const defaultInputSourceArray = [screenInputSource] as XRInputSourceArray

  const execute = () => {
    const now = Date.now()
    screenInputSource.gamepad.timestamp = now

    if (Engine.instance.xrFrame) {
      const session = Engine.instance.xrFrame.session
      // session.inputSources is undefined when the session is ending, we should probably use xrState.sessionActive instead of Engine.instance.xrFrame
      const inputSources = session.inputSources ? session.inputSources : []
      world.inputSources = [...defaultInputSourceArray, ...inputSources]
    } else {
      world.inputSources = defaultInputSourceArray
    }
  }

  const cleanup = async () => {}

  return { execute, cleanup }
}
