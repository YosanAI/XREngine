import { useEffect } from 'react'
import { BackSide, BoxGeometry, Color, CubeTexture, Mesh, MeshBasicMaterial, sRGBEncoding, Texture } from 'three'

import { isClient } from '../../common/functions/isClient'
import { isHMD } from '../../common/functions/isMobile'
import { Engine } from '../../ecs/classes/Engine'
import { defineComponent, useComponent } from '../../ecs/functions/ComponentFunctions'
import { EngineRenderer } from '../../renderer/WebGLRendererSystem'
import { Sky } from '../classes/Sky'
import { SkyTypeEnum } from '../constants/SkyTypeEnum'
import { getPmremGenerator, loadCubeMapTexture, textureLoader } from '../constants/Util'
import { addError, removeError } from '../functions/ErrorFunctions'
import { addObjectToGroup } from './GroupComponent'

export const SkyboxComponent = defineComponent({
  name: 'SkyboxComponent',

  onInit: (entity) => {
    /** 'skyboxGroup' is a hack to get around OVR_multiview not supporting skyboxes properly */
    let skyboxGroup = null as Mesh<BoxGeometry, MeshBasicMaterial> | null
    if (true) {
      // camera far is 10000, so keep it below that
      skyboxGroup = new Mesh(
        new BoxGeometry(100, 100, 100),
        new MeshBasicMaterial({ fog: false, side: BackSide, depthWrite: false })
      )
      // skyboxGroup.renderOrder = -10000
      Engine.instance.currentWorld.scene.add(skyboxGroup)
    }
    return {
      backgroundColor: new Color(0x000000),
      equirectangularPath: '',
      cubemapPath: '/hdr/cubemap/skyboxsun25deg/',
      backgroundType: 1,
      sky: null! as Sky | null,
      /** 'skyboxGroup' is a hack to get around OVR_multiview not supporting skyboxes properly */
      skyboxGroup,
      skyboxProps: {
        turbidity: 10,
        rayleigh: 1,
        luminance: 1,
        mieCoefficient: 0.004999999999999893,
        mieDirectionalG: 0.99,
        inclination: 0.10471975511965978,
        azimuth: 0.16666666666666666
      }
    }
  },

  onSet: (entity, component, json) => {
    if (typeof json?.backgroundColor === 'number') component.backgroundColor.set(new Color(json.backgroundColor))
    if (typeof json?.equirectangularPath === 'string') component.equirectangularPath.set(json.equirectangularPath)
    if (typeof json?.cubemapPath === 'string') component.cubemapPath.set(json.cubemapPath)
    if (typeof json?.backgroundType === 'number') component.backgroundType.set(json.backgroundType)
    if (typeof json?.skyboxProps === 'object') component.skyboxProps.set(json.skyboxProps)
  },

  toJSON: (entity, component) => {
    return {
      backgroundColor: component.backgroundColor.value.getHexString() as any as Color,
      equirectangularPath: component.equirectangularPath.value,
      cubemapPath: component.cubemapPath.value,
      backgroundType: component.backgroundType.value,
      skyboxProps: component.skyboxProps.get({ noproxy: true }) as any
    }
  },

  errors: ['FILE_ERROR'],

  reactor: function ({ root }) {
    const entity = root.entity
    const skyComponentState = useComponent(entity, SkyboxComponent)

    const setBackground = (background: Texture | Color) => {
      /** @todo oculus multiview renders skybox incorrectly, so instead add the skybox to the scene manually */
      if (true) {
        const texture = background as Texture
        const cubeTexture = background as CubeTexture
        const color = background as Color
        console.log(background)
        const material = skyComponentState.skyboxGroup.value!.material
        if (cubeTexture.isCubeTexture) {
          material.color = new Color('white')
          material.envMap = texture
          material.map = null
        } else if (texture.isTexture) {
          material.color = new Color('white')
          material.map = texture
          material.envMap = null
        } else if (color.isColor) {
          material.map = null
          material.envMap = null
          material.color = color
        }
      } else {
        Engine.instance.currentWorld.scene.background = background
      }
    }

    useEffect(() => {
      if (!isClient) return

      const skyComponent = skyComponentState.value

      switch (skyComponent.backgroundType) {
        case SkyTypeEnum.color:
          setBackground(skyComponent.backgroundColor)
          break

        case SkyTypeEnum.cubemap:
          loadCubeMapTexture(
            skyComponent.cubemapPath,
            (texture) => {
              texture.encoding = sRGBEncoding
              setBackground(texture)
              removeError(entity, SkyboxComponent, 'FILE_ERROR')
            },
            undefined,
            (error) => addError(entity, SkyboxComponent, 'FILE_ERROR', error.message)
          )
          break

        case SkyTypeEnum.equirectangular:
          textureLoader.load(
            skyComponent.equirectangularPath,
            (texture) => {
              texture.encoding = sRGBEncoding
              setBackground(getPmremGenerator().fromEquirectangular(texture).texture)
              removeError(entity, SkyboxComponent, 'FILE_ERROR')
            },
            undefined,
            (error) => {
              addError(entity, SkyboxComponent, 'FILE_ERROR', error.message)
            }
          )
          break

        case SkyTypeEnum.skybox:
          if (!skyComponent.sky) skyComponent.sky = new Sky()

          skyComponent.sky.azimuth = skyComponent.skyboxProps.azimuth
          skyComponent.sky.inclination = skyComponent.skyboxProps.inclination

          skyComponent.sky.mieCoefficient = skyComponent.skyboxProps.mieCoefficient
          skyComponent.sky.mieDirectionalG = skyComponent.skyboxProps.mieDirectionalG
          skyComponent.sky.rayleigh = skyComponent.skyboxProps.rayleigh
          skyComponent.sky.turbidity = skyComponent.skyboxProps.turbidity
          skyComponent.sky.luminance = skyComponent.skyboxProps.luminance

          setBackground(
            getPmremGenerator().fromCubemap(
              skyComponent.sky.generateSkyboxTextureCube(EngineRenderer.instance.renderer)
            ).texture
          )

          break

        default:
          break
      }

      if (skyComponent.backgroundType !== SkyTypeEnum.skybox && skyComponent.sky) {
        skyComponent.sky = null
      }
    }, [skyComponentState.backgroundType])

    return null
  }
})

export const SCENE_COMPONENT_SKYBOX = 'skybox'
