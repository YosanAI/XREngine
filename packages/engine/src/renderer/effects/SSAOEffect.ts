import { BlendFunction, Effect } from 'postprocessing'
import { Uniform, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three'

import effect from './glsl/ssao.frag'

export class SSAOEffect extends Effect {
  resolution: Vector2

  constructor({ blendFunction = BlendFunction.NORMAL } = {}) {
    super('SSAOEffect', effect.fragmentShader, {
      blendFunction,

      uniforms: new Map(Object.entries(effect.uniforms).map(([k, v]) => [k, new Uniform(v.value)]))
    })
    this.resolution = new Vector2()
  }

  update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number | undefined): void {
    this.uniforms.get('sceneDiffuse')!.value = inputBuffer.texture
    this.uniforms.get('sceneDepth')!.value = inputBuffer.depthTexture
  }

  setSize(width: number, height: number): void {
    this.resolution.set(width, height)
    this.uniforms.get('resolution')!.value.set(1 / width, 1 / height)
  }
}
