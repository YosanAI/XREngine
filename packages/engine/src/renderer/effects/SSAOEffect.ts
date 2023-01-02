import { BlendFunction, Effect } from 'postprocessing'
import { Uniform, Vector2, Vector4, WebGLRenderer, WebGLRenderTarget } from 'three'

import config from '@xrengine/common/src/config'

import { AssetLoader } from '../../assets/classes/AssetLoader'
import { pathResolver } from '../../assets/functions/pathResolver'
import { Engine } from '../../ecs/classes/Engine'
import { addComponent } from '../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../ecs/functions/EntityFunctions'
import { setCallback } from '../../scene/components/CallbackComponent'
import { UpdatableCallback, UpdatableComponent } from '../../scene/components/UpdatableComponent'
import effect from './glsl/ssao.frag'

export class SSAOEffect extends Effect {
  resolution: Vector2

  constructor(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, blendFunction = BlendFunction.NORMAL) {
    super('SSAOEffect', effect.fragmentShader, {
      blendFunction,
      uniforms: new Map(Object.entries(effect.uniforms).map(([k, v]) => [k, new Uniform(v.value)]))
    })
    this.resolution = new Vector2()
    this.update(renderer, inputBuffer)
    const entity = createEntity()
    addComponent(entity, UpdatableComponent, true)
    setCallback(entity, UpdatableCallback, () => {
      const camera = Engine.instance.currentWorld.camera
      this.uniforms.get('time')!.value = Engine.instance.currentWorld.elapsedSeconds
      this.uniforms.get('projViewMat')!.value = camera.projectionMatrix
        .clone()
        .multiply(camera.matrixWorldInverse.clone())
    })
  }

  update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number | undefined): void {
    this.uniforms.get('sceneDepth')!.value = inputBuffer.depthTexture
    this.uniforms.get('bluenoise')!.value = inputBuffer.texture
    config.client.fileServer &&
      AssetLoader.load(
        config.client.fileServer + '/projects/default-project/assets/bluenoise.png',
        {},
        ((txr) => (this.uniforms.get('bluenoise')!.value = txr)).bind(this)
      )
    const camera = Engine.instance.currentWorld.camera
    this.uniforms.get('cameraPos')!.value = camera.position
    this.uniforms.get('projMat')!.value = camera.projectionMatrix
    this.uniforms.get('viewMat')!.value = camera.matrixWorldInverse

    this.uniforms.get('projectionMatrixInv')!.value = camera.projectionMatrixInverse
    this.uniforms.get('viewMatrixInv')!.value = camera.matrixWorld

    const viewPort = new Vector4()
    renderer.getCurrentViewport(viewPort)
    this.uniforms.get('resolution')!.value = new Vector2(viewPort.width, viewPort.height)
  }

  setSize(width: number, height: number): void {
    this.resolution.set(width, height)
    this.uniforms.get('resolution')!.value.set(1 / width, 1 / height)
  }
}
