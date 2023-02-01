import { SystemUpdateType } from '../ecs/functions/SystemUpdateType'
import XRAnchorSystem from './XRAnchorSystem'
import XRSystem from './XRSystem'

export function XRModule() {
  return [
    {
      uuid: 'xre.engine.XRSystem',
      type: SystemUpdateType.UPDATE_EARLY,
      systemLoader: () => Promise.resolve({ default: XRSystem })
    }
  ]
}
