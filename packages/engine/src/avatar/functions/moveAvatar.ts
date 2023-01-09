import { Collider } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'

import { getMutableState } from '@xrengine/hyperflux'

import { ObjectDirection } from '../../common/constants/Axis3D'
import { V_010 } from '../../common/constants/MathConstants'
import checkPositionIsValid from '../../common/functions/checkPositionIsValid'
import { Engine } from '../../ecs/classes/Engine'
import { EngineState } from '../../ecs/classes/EngineState'
import { Entity } from '../../ecs/classes/Entity'
import {
  addComponent,
  ComponentType,
  getComponent,
  hasComponent,
  removeComponent,
  setComponent
} from '../../ecs/functions/ComponentFunctions'
import { NetworkObjectAuthorityTag } from '../../networking/components/NetworkObjectComponent'
import { Physics } from '../../physics/classes/Physics'
import { RigidBodyComponent } from '../../physics/components/RigidBodyComponent'
import { CollisionGroups } from '../../physics/enums/CollisionGroups'
import { getInteractionGroups } from '../../physics/functions/getInteractionGroups'
import { SceneQueryType } from '../../physics/types/PhysicsTypes'
import { EngineRenderer } from '../../renderer/WebGLRendererSystem'
import { LocalTransformComponent, TransformComponent } from '../../transform/components/TransformComponent'
import { getAvatarHeadLock, getControlMode, XRState } from '../../xr/XRState'
import { AvatarSettings, rotateBodyTowardsCameraDirection, rotateBodyTowardsVector } from '../AvatarControllerSystem'
import { AvatarAnimationComponent, AvatarRigComponent } from '../components/AvatarAnimationComponent'
import { AvatarComponent } from '../components/AvatarComponent'
import { AvatarControllerComponent } from '../components/AvatarControllerComponent'
import { AvatarHeadDecapComponent } from '../components/AvatarIKComponents'
import { AvatarTeleportComponent } from '../components/AvatarTeleportComponent'
import { AvatarInputSettingsState, AvatarMovementScheme } from '../state/AvatarInputSettingsState'
import { avatarRadius } from './spawnAvatarReceptor'

const _vec = new Vector3()
const _vec2 = new Vector3()
const _quat = new Quaternion()
const _quat2 = new Quaternion()
const quat180y = new Quaternion().setFromAxisAngle(V_010, Math.PI)

export const avatarCameraOffset = new Vector3(0, 0.14, 0.1)

/**
 * configurables
 */
const stepHeight = 0.5
const stepAngle = (60 * Math.PI) / 180 // 60 degrees

/**
 * raycast internals
 */
const expandedAvatarRadius = avatarRadius + 0.025
const stepLowerBound = avatarRadius * 0.25
const minimumStepSpeed = 0.1
const avatarStepRaycast = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: ObjectDirection.Down,
  maxDistance: stepHeight,
  groups: getInteractionGroups(CollisionGroups.Avatars, CollisionGroups.Ground)
}

/**
 * Updates the avatar's isInAir property based on current physics contacts points
 * @param entity
 */
export const updateAvatarControllerOnGround = (entity: Entity) => {
  const controller = getComponent(entity, AvatarControllerComponent) as ComponentType<typeof AvatarControllerComponent>

  /**
   * Use physics contacts to detemine if avatar is grounded
   */
  const physicsWorld = Engine.instance.currentWorld.physicsWorld
  const collidersInContactWithFeet = [] as Collider[]
  physicsWorld.contactsWith(controller.bodyCollider, (otherCollider) => {
    if (otherCollider) collidersInContactWithFeet.push(otherCollider)
  })

  let onGround = false

  for (const otherCollider of collidersInContactWithFeet) {
    physicsWorld.contactPair(controller.bodyCollider, otherCollider, (manifold, flipped) => {
      if (manifold.numContacts() > 0) {
        _vec.copy(manifold.normal() as Vector3)
        if (!flipped) _vec.normalize().negate()
        const angle = _vec.angleTo(V_010)
        if (angle < stepAngle) onGround = true
      }
    })
    if (onGround) break
  }

  controller.isInAir = !onGround
}

//   const avatarInputState = getState(AvatarInputSettingsState)
//   /** teleport controls handled in AvatarInputSchema */
//   if (getControlMode() === 'attached' && avatarInputState.controlScheme.value === AvatarMovementScheme.Teleport) return

//   moveAvatarWithVelocity(entity)
// }

/**
 * Moves the avatar with velocity controls
 * @param entity
 */
export const moveAvatarWithVelocity = (entity: Entity) => {
  const isInVR = getControlMode() === 'attached'
  const avatarInputState = getMutableState(AvatarInputSettingsState)
  if (isInVR && avatarInputState.controlScheme.value !== AvatarMovementScheme.Linear) {
    return
  }

  const camera = Engine.instance.currentWorld.camera
  const cameraDirection = camera.getWorldDirection(_vec).setY(0).normalize()
  const forwardOrientation = _quat.setFromUnitVectors(ObjectDirection.Forward, cameraDirection)

  avatarApplyVelocity(entity, forwardOrientation)
  avatarApplyRotation(entity)
  avatarStepOverObstacles(entity, forwardOrientation)
}

/**
 * Rotates the avatar
 * - if we are in attached mode, we dont need to do any extra rotation
 *     as this is done via the webxr camera automatically
 */
export const avatarApplyRotation = (entity: Entity) => {
  const isInVR = getControlMode() === 'attached'
  if (!isInVR) {
    if (hasComponent(entity, AvatarHeadDecapComponent)) {
      rotateBodyTowardsCameraDirection(entity)
    } else {
      rotateBodyTowardsVector(entity, getComponent(entity, RigidBodyComponent).linearVelocity)
    }
  }
}

/**
 * Avatar movement via velocity spring and collider velocity
 */
export const avatarApplyVelocity = (entity: Entity, forwardOrientation: Quaternion) => {
  const controller = getComponent(entity, AvatarControllerComponent) as ComponentType<typeof AvatarControllerComponent>
  const rigidBody = getComponent(entity, RigidBodyComponent)
  const timeStep = getMutableState(EngineState).fixedDeltaSeconds.value
  const isInVR = getControlMode() === 'attached'

  // always walk in VR
  controller.currentSpeed =
    controller.isWalking || isInVR ? AvatarSettings.instance.walkSpeed : AvatarSettings.instance.runSpeed

  controller.velocitySimulator.target.copy(controller.localMovementDirection)
  controller.velocitySimulator.simulate(timeStep * (controller.isInAir ? 0.2 : 1))
  const velocitySpringDirection = controller.velocitySimulator.position

  const prevVelocity = rigidBody.body.linvel()
  const currentVelocity = _vec
    .copy(velocitySpringDirection)
    .multiplyScalar(controller.currentSpeed)
    .applyQuaternion(forwardOrientation)
    .setComponent(1, prevVelocity.y)

  if (controller.isInAir) {
    // apply gravity to avatar velocity
    currentVelocity.y = prevVelocity.y - 9.81 * timeStep
  } else {
    currentVelocity.y = 0
    if (controller.localMovementDirection.y > 0 && !controller.isJumping) {
      // Formula: takeoffVelocity = sqrt(2 * jumpHeight * gravity)
      currentVelocity.y = Math.sqrt(2 * AvatarSettings.instance.jumpHeight * 9.81)
      controller.isJumping = true
    } else if (controller.isJumping) {
      controller.isJumping = false
    }
  }

  if (hasComponent(entity, NetworkObjectAuthorityTag)) {
    rigidBody.body.setLinvel(currentVelocity, true)
  }
}

export const avatarStepOverObstacles = (entity: Entity, forwardOrientation: Quaternion) => {
  const transform = getComponent(entity, TransformComponent)
  const controller = getComponent(entity, AvatarControllerComponent)
  const rigidBody = getComponent(entity, RigidBodyComponent)

  const velocitySpringDirection = controller.velocitySimulator.position
  /**
   * Step over small obstacles
   */
  const xzVelocity = _vec.copy(velocitySpringDirection).setY(0)
  const xzVelocitySqrMagnitude = xzVelocity.lengthSq()
  if (xzVelocitySqrMagnitude > minimumStepSpeed) {
    // TODO this can be improved by using a shapeCast with a plane instead of a line
    // set the raycast position to the egde of the bottom of the cylindical portion of the capsule collider in the direction of motion
    avatarStepRaycast.origin
      .copy(transform.position)
      .add(xzVelocity.normalize().multiplyScalar(expandedAvatarRadius).applyQuaternion(forwardOrientation))
    avatarStepRaycast.origin.y += stepLowerBound + stepHeight
    const hits = Physics.castRay(Engine.instance.currentWorld.physicsWorld, avatarStepRaycast)
    if (hits.length && hits[0].collider !== controller.bodyCollider) {
      _vec.copy(hits[0].normal as Vector3)
      const angle = _vec.angleTo(V_010)
      if (angle < stepAngle) {
        const pos = rigidBody.body.translation()
        pos.y += stepHeight - hits[0].distance
        rigidBody.body.setTranslation(pos, true)
      }
    }
  }
}

const quat = new Quaternion()

/**
 * Updates the WebXR reference space, effectively moving the world to be in alignment with where the viewer should be seeing it.
 * @param entity
 */
export const updateReferenceSpace = (entity: Entity) => {
  const xrState = getMutableState(XRState)
  const viewerPose = Engine.instance.xrFrame?.getViewerPose(xrState.originReferenceSpace.value!)
  const refSpace = xrState.originReferenceSpace.value

  if (getControlMode() === 'attached' && refSpace && viewerPose) {
    const avatarTransform = getComponent(entity, TransformComponent)
    const rig = getComponent(entity, AvatarRigComponent)

    const avatarHeadLock = getAvatarHeadLock()

    if (avatarHeadLock && rig) {
      rig.rig.Head.getWorldPosition(_vec)
      _vec.y += 0.14
      _vec.y -= viewerPose.transform.position.y
      const headOffset = _vec2.set(0, 0, 0.1).applyQuaternion(avatarTransform.rotation)
      _vec.add(headOffset)
    } else {
      _vec.copy(avatarTransform.position)
    }

    // rotate 180 degrees as physics looks down +z, and webxr looks down -z
    quat.copy(avatarTransform.rotation).multiply(quat180y)
    const xrRigidTransform = new XRRigidTransform(_vec, quat)
    const offsetRefSpace = refSpace.getOffsetReferenceSpace(xrRigidTransform.inverse)
    EngineRenderer.instance.xrManager.setReferenceSpace(offsetRefSpace)
  }
}

/**
 * Rotates the avatar's rigidbody around the Y axis by a given entity
 * @param entity
 * @param angle
 */
export const rotateAvatar = (entity: Entity, angle: number) => {
  _quat.setFromAxisAngle(V_010, angle)
  const rigidBody = getComponent(entity, RigidBodyComponent).body
  _quat2.copy(rigidBody.rotation() as Quaternion).multiply(_quat)
  rigidBody.setRotation(_quat2, true)
}

/**
 * Teleports the avatar to new position
 * @param entity
 * @param newPosition
 */
export const teleportAvatar = (entity: Entity, targetPosition: Vector3): void => {
  if (!hasComponent(entity, AvatarComponent)) {
    console.warn('Teleport avatar called on non-avatar entity')
    return
  }

  const raycastOrigin = targetPosition.clone()
  raycastOrigin.y += 0.1
  const { raycastHit } = checkPositionIsValid(raycastOrigin, false)

  if (raycastHit) {
    const pos = new Vector3().copy(raycastHit.position as Vector3)
    const transform = getComponent(entity, TransformComponent)
    transform.position.copy(pos)
  } else {
    console.log('invalid position', targetPosition, raycastHit)
  }
}
