import { Matrix4, Quaternion, Vector2, Vector3 } from 'three'

import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { World } from '@xrengine/engine/src/ecs/classes/World'
import { defineQuery, getComponent, removeQuery } from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import { getMutableState } from '@xrengine/hyperflux'

import { V_010 } from '../common/constants/MathConstants'
import { LocalTransformComponent } from '../transform/components/TransformComponent'
import { FlyControlComponent } from './components/FlyControlComponent'

const EPSILON = 10e-5
const IDENTITY = new Matrix4().identity()

export default async function FlyControlSystem(world: World) {
  const flyControlQuery = defineQuery([FlyControlComponent])
  const direction = new Vector3()
  const parentInverse = new Matrix4()
  const tempVec3 = new Vector3()
  const quat = new Quaternion()
  const worldPos = new Vector3()
  const worldQuat = new Quaternion()
  const worldScale = new Vector3(1, 1, 1)
  const candidateWorldQuat = new Quaternion()

  const execute = () => {
    if (!world.buttons.SecondaryClick?.pressed && !world.buttons.PrimaryClick?.pressed) return
    for (const entity of flyControlQuery()) {
      const flyControlComponent = getComponent(entity, FlyControlComponent)
      const camera = Engine.instance.currentWorld.camera

      const inputState = world.buttons

      const mouseMovement = world.pointerState.movement

      camera.matrixWorld.decompose(worldPos, worldQuat, worldScale)

      // rotate about the camera's local x axis
      candidateWorldQuat.multiplyQuaternions(
        quat.setFromAxisAngle(
          tempVec3.set(1, 0, 0).applyQuaternion(worldQuat),
          mouseMovement.y * flyControlComponent.lookSensitivity
        ),
        worldQuat
      )

      // check change of local "forward" and "up" to disallow flipping
      const camUpY = tempVec3.set(0, 1, 0).applyQuaternion(worldQuat).y
      const newCamUpY = tempVec3.set(0, 1, 0).applyQuaternion(candidateWorldQuat).y
      const newCamForwardY = tempVec3.set(0, 0, -1).applyQuaternion(candidateWorldQuat).y
      const extrema = Math.sin(flyControlComponent.maxXRotation)
      const allowRotationInX =
        newCamUpY > 0 && ((newCamForwardY < extrema && newCamForwardY > -extrema) || newCamUpY > camUpY)

      if (allowRotationInX) {
        camera.matrixWorld.compose(worldPos, candidateWorldQuat, worldScale)
        // assume that if camera.parent exists, its matrixWorld is up to date
        parentInverse.copy(camera.parent ? camera.parent.matrixWorld : IDENTITY).invert()
        camera.matrix.multiplyMatrices(parentInverse, camera.matrixWorld)
        camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale)
      }

      camera.matrixWorld.decompose(worldPos, worldQuat, worldScale)
      // rotate about the world y axis
      candidateWorldQuat.multiplyQuaternions(
        quat.setFromAxisAngle(V_010, -mouseMovement.x * flyControlComponent.lookSensitivity),
        worldQuat
      )

      camera.matrixWorld.compose(worldPos, candidateWorldQuat, worldScale)
      camera.matrix.multiplyMatrices(parentInverse, camera.matrixWorld)
      camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)

      const lateralMovement = (inputState.KeyD?.pressed ? 1 : 0) + (inputState.KeyA?.pressed ? -1 : 0)
      const forwardMovement = (inputState.KeyS?.pressed ? 1 : 0) + (inputState.KeyW?.pressed ? -1 : 0)
      const upwardMovement = (inputState.KeyE?.pressed ? 1 : 0) + (inputState.KeyQ?.pressed ? -1 : 0)

      // translate
      direction.set(lateralMovement, 0, forwardMovement)
      const boostSpeed = inputState.ShiftLeft?.pressed ? flyControlComponent.boostSpeed : 1
      const speed = world.deltaSeconds * flyControlComponent.moveSpeed * boostSpeed

      if (direction.lengthSq() > EPSILON) camera.translateOnAxis(direction, speed)

      camera.position.y += upwardMovement * world.deltaSeconds * flyControlComponent.moveSpeed * boostSpeed

      const localTransform = getComponent(world.cameraEntity, LocalTransformComponent)
      localTransform.position.copy(camera.position)
      localTransform.rotation.copy(camera.quaternion)
    }
  }

  const cleanup = async () => {
    removeQuery(world, flyControlQuery)
  }

  return { execute, cleanup }
}
