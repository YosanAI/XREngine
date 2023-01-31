import { useEffect } from 'react'
import { Bone, Object3D } from 'three'

import { NO_PROXY } from '@xrengine/hyperflux'

import { Entity } from '../../ecs/classes/Entity'
import {
  createMappedComponent,
  defineComponent,
  getComponent,
  hasComponent,
  useOptionalComponent
} from '../../ecs/functions/ComponentFunctions'
import { QuaternionSchema, Vector3Schema } from '../../transform/components/TransformComponent'
import { AvatarRigComponent } from './AvatarAnimationComponent'

const EPSILON = 1e-6

export const AvatarHeadDecapComponent = defineComponent({
  name: 'AvatarHeadDecapComponent',

  reactor: function ({ root }) {
    const entity = root.entity

    const headDecap = useOptionalComponent(entity, AvatarHeadDecapComponent)
    const rig = useOptionalComponent(entity, AvatarRigComponent)

    useEffect(() => {
      if (rig?.value) {
        if (headDecap?.value) {
          rig.value.rig.Head?.scale.setScalar(EPSILON)
        } else {
          rig.value.rig.Head?.scale.setScalar(1)
        }
      }
    }, [headDecap, rig])

    return null
  }
})

export type AvatarHeadIKComponentType = {
  target: Object3D
  /**
   * Clamp the angle between bone forward vector and camera forward in radians
   * Use 0 to disable
   */
  rotationClamp: number
}

const PoseSchema = {
  position: Vector3Schema,
  quaternion: QuaternionSchema
}

const XRHeadIKSchema = {
  target: PoseSchema
}

export const AvatarHeadIKComponent = createMappedComponent<AvatarHeadIKComponentType, typeof XRHeadIKSchema>(
  'AvatarHeadIKComponent',
  XRHeadIKSchema
)

/**
 * Avatar Hands IK Solver Component.
 */
export type AvatarHandsIKComponentType = {
  target: Object3D
  hint: Object3D
  targetOffset: Object3D
  targetPosWeight: number
  targetRotWeight: number
  hintWeight: number
}

const HandIKSchema = {
  target: PoseSchema
}

export const AvatarLeftHandIKComponent = createMappedComponent<AvatarHandsIKComponentType, typeof HandIKSchema>(
  'AvatarLeftHandIKComponent',
  HandIKSchema
)
export const AvatarRightHandIKComponent = createMappedComponent<AvatarHandsIKComponentType, typeof HandIKSchema>(
  'AvatarRightHandIKComponent',
  HandIKSchema
)

export type AvatarIKTargetsType = {
  head: boolean
  leftHand: boolean
  rightHand: boolean
}

export const AvatarIKTargetsComponent = createMappedComponent<AvatarIKTargetsType>('AvatarIKTargetsComponent')

/**
 * Gets the hand position in world space
 * @param entity the player entity
 * @param hand which hand to get
 * @returns {Vector3}
 */
export const getHandTarget = (entity: Entity, hand: XRHandedness): Object3D | null => {
  switch (hand) {
    case 'left':
      if (hasComponent(entity, AvatarLeftHandIKComponent))
        return getComponent(entity, AvatarLeftHandIKComponent).target as Object3D
      if (hasComponent(entity, AvatarRigComponent)) return getComponent(entity, AvatarRigComponent).rig.LeftHand as Bone
      break
    case 'right':
      if (hasComponent(entity, AvatarRightHandIKComponent))
        return getComponent(entity, AvatarRightHandIKComponent).target as Object3D
      if (hasComponent(entity, AvatarRigComponent))
        return getComponent(entity, AvatarRigComponent).rig.RightHand as Bone
      break
    case 'none':
      if (hasComponent(entity, AvatarHeadIKComponent))
        return getComponent(entity, AvatarHeadIKComponent).target as Object3D
      if (hasComponent(entity, AvatarRigComponent)) return getComponent(entity, AvatarRigComponent).rig.Head as Bone
      break
  }
  return null
}
