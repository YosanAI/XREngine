import { AvatarInputSettingsState } from '@xrengine/engine/src/avatar/state/AvatarInputSettingsState'
import { World } from '@xrengine/engine/src/ecs/classes/World'
import { removeComponent, setComponent } from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import { VisibleComponent } from '@xrengine/engine/src/scene/components/VisibleComponent'
import { getControlMode, XRAction, XRState } from '@xrengine/engine/src/xr/XRState'
import { XRUIInteractableComponent } from '@xrengine/engine/src/xrui/components/XRUIComponent'
import { createXRUI } from '@xrengine/engine/src/xrui/functions/createXRUI'
import { WidgetAppActions, WidgetAppState } from '@xrengine/engine/src/xrui/WidgetAppService'
import { Widget, Widgets } from '@xrengine/engine/src/xrui/Widgets'
import { createActionQueue, dispatchAction, getMutableState, removeActionQueue } from '@xrengine/hyperflux'

import AnchorIcon from '@mui/icons-material/Anchor'

import { AnchorWidgetUI } from './ui/AnchorWidgetUI'

export function createAnchorWidget(world: World) {
  const ui = createXRUI(AnchorWidgetUI)
  removeComponent(ui.entity, VisibleComponent)
  setComponent(ui.entity, XRUIInteractableComponent)
  const xrState = getMutableState(XRState)
  const avatarInputSettings = getMutableState(AvatarInputSettingsState)

  const widgetState = getMutableState(WidgetAppState)

  const xrSessionQueue = createActionQueue(XRAction.sessionChanged.matches)

  const widget: Widget = {
    ui,
    label: 'World Anchor',
    icon: AnchorIcon,
    onOpen: () => {
      dispatchAction(
        XRAction.changePlacementMode({
          active: true
        })
      )
    },
    system: () => {
      for (const action of xrSessionQueue()) {
        const widgetEnabled = xrState.sessionMode.value === 'immersive-ar'
        if (widgetState.widgets[id].enabled.value !== widgetEnabled)
          dispatchAction(WidgetAppActions.enableWidget({ id, enabled: widgetEnabled }))
      }
      const isImmersive = getControlMode() === 'attached'
      if (!isImmersive) return
      if (!xrState.scenePlacementMode.value) return
      const buttonInput =
        avatarInputSettings.preferredHand.value === 'left' ? world.buttons.ButtonX?.down : world.buttons.ButtonA?.down
      if (buttonInput) {
        dispatchAction(
          XRAction.changePlacementMode({
            active: false
          })
        )
      }
    },
    cleanup: async () => {
      removeActionQueue(xrSessionQueue)
    }
  }

  const id = Widgets.registerWidget(world, ui.entity, widget)
}
