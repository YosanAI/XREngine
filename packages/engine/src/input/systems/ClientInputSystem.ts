import { isClient } from '../../common/functions/isClient'
import { World } from '../../ecs/classes/World'
import { EngineRenderer } from '../../renderer/WebGLRendererSystem'
import normalizeWheel from '../functions/normalizeWheel'
import { ButtonInputStateType, ButtonTypes, createInitialButtonState } from '../InputState'

function preventDefault(e) {
  e.preventDefault()
}

interface ListenerBindingData {
  domElement: any
  eventName: string
  callback: (event) => void
}

const boundListeners: ListenerBindingData[] = []

export const addClientInputListeners = (world: World) => {
  if (!isClient) return
  const canvas = EngineRenderer.instance.canvas

  window.addEventListener('DOMMouseScroll', preventDefault, false)
  window.addEventListener(
    'keydown',
    (evt) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (evt.code === 'Tab') evt.preventDefault()
      // prevent DOM tab selection and spacebar/enter button toggling (since it interferes with avatar controls)
      if (evt.code === 'Space' || evt.code === 'Enter') evt.preventDefault()
    },
    false
  )

  const addListener = (
    domElement: HTMLElement | Document | Window,
    eventName,
    callback: (event: Event) => void,
    options?: boolean | AddEventListenerOptions
  ) => {
    domElement.addEventListener(eventName, callback, options)
    boundListeners.push({
      domElement,
      eventName,
      callback
    })
  }

  addListener(document, 'gesturestart', preventDefault)
  addListener(canvas, 'contextmenu', preventDefault)

  const handleMouseClick = (event: MouseEvent) => {
    const down = event.type === 'mousedown' || event.type === 'touchstart'

    let button: ButtonTypes = 'PrimaryClick'
    if (event.button === 1) button = 'AuxiliaryClick'
    else if (event.button === 2) button = 'SecondaryClick'

    const state = world.buttons as ButtonInputStateType

    if (down) state[button] = createInitialButtonState()
    else if (state[button]) state[button]!.up = true
  }

  const handleMouseMove = (event: MouseEvent) => {
    world.pointerState.position.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * -2 + 1
    )
  }

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    world.pointerState.position.set(
      (touch.clientX / window.innerWidth) * 2 - 1,
      (touch.clientY / window.innerHeight) * -2 + 1
    )
  }

  addListener(window, 'touchmove', handleTouchMove, { passive: true, capture: true })
  addListener(window, 'mousemove', handleMouseMove, { passive: true, capture: true })
  addListener(canvas, 'mouseup', handleMouseClick)
  addListener(canvas, 'mousedown', handleMouseClick)
  addListener(canvas, 'touchstart', handleMouseClick)
  addListener(canvas, 'touchend', handleMouseClick)

  const handleTouchDirectionalPad = (event: CustomEvent): void => {
    const { stick, value }: { stick: 'StickLeft' | 'StickRight'; value: { x: number; y: number } } = event.detail
    if (!stick) {
      return
    }

    // TODO: This is a hack to support gamepad input in WebXR AR sessions
    const index = 0 //world.inputSources.length === 1 || stick === 'StickLeft' ? 0 : 1
    const inputSource = world.inputSources[index]

    const axes = inputSource.gamepad!.axes as number[]

    axes[0] = value.x
    axes[1] = value.y
  }
  addListener(document, 'touchstickmove', handleTouchDirectionalPad)

  const pointerButtons = ['PrimaryClick', 'AuxiliaryClick', 'SecondaryClick']
  const clearKeyState = () => {
    const state = world.buttons as ButtonInputStateType
    for (const button of pointerButtons) {
      const val = state[button]
      if (!val?.up && val?.pressed) state[button].up = true
    }
  }
  addListener(window, 'focus', clearKeyState)
  addListener(window, 'blur', clearKeyState)
  addListener(canvas, 'mouseleave', clearKeyState)

  const handleVisibilityChange = (event: Event) => {
    if (document.visibilityState === 'hidden') clearKeyState()
  }

  addListener(document, 'visibilitychange', handleVisibilityChange)

  /** new */
  const onKeyEvent = (event: KeyboardEvent) => {
    const element = event.target as HTMLElement
    // Сheck which excludes the possibility of controlling the avatar when typing in a text field
    if (element?.tagName === 'INPUT' || element?.tagName === 'SELECT' || element?.tagName === 'TEXTAREA') return

    const code = event.code
    const down = event.type === 'keydown'

    if (down) world.buttons[code] = createInitialButtonState()
    else if (world.buttons[code]) world.buttons[code].up = true
  }
  addListener(document, 'keyup', onKeyEvent)
  addListener(document, 'keydown', onKeyEvent)

  const onWheelEvent = (event: WheelEvent) => {
    const normalizedValues = normalizeWheel(event)
    const x = Math.sign(normalizedValues.spinX + Math.random() * 0.000001)
    const y = Math.sign(normalizedValues.spinY + Math.random() * 0.000001)
    world.pointerState.scroll.x += x
    world.pointerState.scroll.y += y
  }
  addListener(canvas, 'wheel', onWheelEvent, { passive: true, capture: true })
}

export const removeClientInputListeners = () => {
  // if not client, no listeners will exist
  if (!boundListeners.length) return

  window.removeEventListener('DOMMouseScroll', preventDefault, false)

  boundListeners.forEach(({ domElement, eventName, callback }) => {
    domElement.removeEventListener(eventName, callback)
  })
  boundListeners.splice(0, boundListeners.length - 1)
}

export const GamepadMapping = {
  //https://w3c.github.io/gamepad/#remapping
  standard: {
    0: 'ButtonA',
    1: 'ButtonB',
    2: 'ButtonX',
    3: 'ButtonY',
    4: 'LeftBumper',
    5: 'RightBumper',
    6: 'LeftTrigger',
    7: 'RightTrigger',
    8: 'ButtonBack',
    9: 'ButtonStart',
    10: 'LeftStick',
    11: 'RightStick',
    12: 'DPad1',
    13: 'DPad2',
    14: 'DPad3',
    15: 'DPad4'
  },
  //https://www.w3.org/TR/webxr-gamepads-module-1/
  'xr-standard': {
    left: {
      0: 'LeftTrigger',
      1: 'LeftBumper',
      2: 'LeftPad',
      3: 'LeftStick',
      4: 'ButtonX',
      5: 'ButtonY'
    },
    right: {
      0: 'RightTrigger',
      1: 'RightBumper',
      2: 'RightPad',
      3: 'RightStick',
      4: 'ButtonA',
      5: 'ButtonB'
    },
    none: {
      0: 'RightTrigger',
      1: 'RightBumper',
      2: 'RightPad',
      3: 'RightStick',
      4: 'ButtonA',
      5: 'ButtonB'
    }
  }
}
export function updateGamepadInput(world: World, source: XRInputSource) {
  if (!source.gamepad) return
  if (source.gamepad.mapping in GamepadMapping) {
    const ButtonAlias = GamepadMapping[source.gamepad!.mapping]
    const mapping = ButtonAlias[source.handedness]
    const buttons = source.gamepad?.buttons
    if (buttons) {
      for (let i = 0; i < buttons.length; i++) {
        const buttonMapping = mapping[i]
        const button = buttons[i]
        if (!world.buttons[buttonMapping] && (button.pressed || button.touched)) {
          world.buttons[buttonMapping] = createInitialButtonState(button)
        }
        if (world.buttons[buttonMapping] && (button.pressed || button.touched)) {
          if (!world.buttons[buttonMapping].pressed && button.pressed) world.buttons[buttonMapping].down = true
          world.buttons[buttonMapping].pressed = button.pressed
          world.buttons[buttonMapping].touched = button.touched
          world.buttons[buttonMapping].value = button.value
        } else if (world.buttons[buttonMapping]) {
          world.buttons[buttonMapping].up = true
        }
      }
    }
  }
}

export default async function ClientInputSystem(world: World) {
  addClientInputListeners(world)
  world.pointerScreenRaycaster.layers.enableAll()

  const execute = () => {
    for (const source of world.inputSources) updateGamepadInput(world, source)

    world.pointerScreenRaycaster.setFromCamera(world.pointerState.position, world.camera)

    world.pointerState.movement.subVectors(world.pointerState.position, world.pointerState.lastPosition)
    world.pointerState.lastPosition.copy(world.pointerState.position)

    world.pointerState.lastScroll.copy(world.pointerState.scroll)
  }

  const cleanup = async () => {
    removeClientInputListeners()
  }

  return { execute, cleanup }
}
