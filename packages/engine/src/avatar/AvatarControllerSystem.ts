import { addActionReceptor, createActionQueue, dispatchAction } from '@xrengine/hyperflux'

import { FollowCameraComponent } from '../camera/components/FollowCameraComponent'
import { Engine } from '../ecs/classes/Engine'
import { World } from '../ecs/classes/World'
import {
  defineQuery,
  getComponent,
  getOptionalComponent,
  hasComponent,
  removeComponent,
  removeQuery,
  setComponent
} from '../ecs/functions/ComponentFunctions'
import { LocalInputTagComponent } from '../input/components/LocalInputTagComponent'
import { NetworkObjectAuthorityTag, NetworkObjectComponent } from '../networking/components/NetworkObjectComponent'
import { WorldNetworkAction } from '../networking/functions/WorldNetworkAction'
import { RigidBodyComponent } from '../physics/components/RigidBodyComponent'
import { XRAction } from '../xr/XRState'
import { AvatarControllerComponent } from './components/AvatarControllerComponent'
import { AvatarHeadDecapComponent } from './components/AvatarIKComponents'
import { respawnAvatar } from './functions/respawnAvatar'
import { AvatarInputSettingsReceptor } from './state/AvatarInputSettingsState'

export default async function AvatarControllerSystem(world: World) {
  const localControllerQuery = defineQuery([AvatarControllerComponent, LocalInputTagComponent])
  const controllerQuery = defineQuery([AvatarControllerComponent])
  const sessionChangedActions = createActionQueue(XRAction.sessionChanged.matches)

  addActionReceptor(AvatarInputSettingsReceptor)

  const execute = () => {
    for (const action of sessionChangedActions()) {
      if (action.active) {
        for (const avatarEntity of localControllerQuery()) {
          const controller = getComponent(avatarEntity, AvatarControllerComponent)
          removeComponent(controller.cameraEntity, FollowCameraComponent)
        }
      } else {
        for (const avatarEntity of localControllerQuery()) {
          const controller = getComponent(avatarEntity, AvatarControllerComponent)
          setComponent(controller.cameraEntity, FollowCameraComponent, { targetEntity: avatarEntity })
        }
      }
    }

    for (const avatarEntity of localControllerQuery.enter()) {
      const controller = getComponent(avatarEntity, AvatarControllerComponent)

      setComponent(controller.cameraEntity, FollowCameraComponent, { targetEntity: avatarEntity })

      // todo: this should be called when the avatar is spawned
      dispatchAction(WorldNetworkAction.spawnCamera({}))
    }

    for (const entity of controllerQuery()) {
      const controller = getComponent(entity, AvatarControllerComponent)
      const followCamera = getOptionalComponent(controller.cameraEntity, FollowCameraComponent)
      if (followCamera) {
        // todo calculate head size and use that as the bound #7263
        if (followCamera.distance < 0.6) setComponent(entity, AvatarHeadDecapComponent, true)
        else removeComponent(entity, AvatarHeadDecapComponent)
      }
    }

    const controlledEntity = Engine.instance.currentWorld.localClientEntity

    if (hasComponent(controlledEntity, AvatarControllerComponent)) {
      const controller = getComponent(controlledEntity, AvatarControllerComponent)

      if (controller.movementEnabled) {
        /** Support multiple peers controlling the same avatar by detecting movement and overriding network authority.
         *    @todo we may want to make this an networked action, rather than lazily removing the NetworkObjectAuthorityTag
         *    if detecting input on the other user #7263
         */
        if (
          !hasComponent(controlledEntity, NetworkObjectAuthorityTag) &&
          world.worldNetwork &&
          controller.gamepadWorldMovement.lengthSq() > 0.1
        ) {
          const networkObject = getComponent(controlledEntity, NetworkObjectComponent)
          dispatchAction(
            WorldNetworkAction.transferAuthorityOfObject({
              ownerId: networkObject.ownerId,
              networkId: networkObject.networkId,
              newAuthority: world.worldNetwork?.peerID
            })
          )
          setComponent(controlledEntity, NetworkObjectAuthorityTag)
        }
      }

      const rigidbody = getComponent(controlledEntity, RigidBodyComponent)
      if (rigidbody.position.y < -10) respawnAvatar(controlledEntity)
    }
  }

  const cleanup = async () => {
    removeQuery(world, localControllerQuery)
    removeQuery(world, controllerQuery)
  }

  return { execute, cleanup }
}
