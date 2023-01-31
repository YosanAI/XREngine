import { createState, SetInitialStateAction, State } from '@hookstate/core'

import multiLogger from '@xrengine/common/src/logger'
import { isNode } from '@xrengine/engine/src/common/functions/getEnvironment'

import { HyperFlux, HyperStore } from './StoreFunctions'

export * from '@hookstate/core'

const logger = multiLogger.child({ component: 'hyperflux:State' })

export const NO_PROXY = { noproxy: true }

export type StateDefinition<S> = {
  name: string
  initial: SetInitialStateAction<S>
  onCreate?: (store: HyperStore, state: State<S>) => void
}

export function defineState<S>(definition: StateDefinition<S>) {
  return definition
}

export function registerState<S>(StateDefinition: StateDefinition<S>, store = HyperFlux.store) {
  logger.info(`registerState ${StateDefinition.name}`)
  if (StateDefinition.name in store.state) {
    const err = new Error(`State ${StateDefinition.name} has already been registered in Store`)
    logger.error(err)
    throw err
  }
  const initial =
    typeof StateDefinition.initial === 'function'
      ? (StateDefinition.initial as Function)()
      : JSON.parse(JSON.stringify(StateDefinition.initial))
  store.state[StateDefinition.name] = createState(initial)
  if (StateDefinition.onCreate) StateDefinition.onCreate(store, getState(StateDefinition, store))
}

export function getState<S>(StateDefinition: StateDefinition<S>, store = HyperFlux.store) {
  if (!store.state[StateDefinition.name]) registerState(StateDefinition, store)
  return store.state[StateDefinition.name] as State<S>
}

const stateNamespaceKey = 'ee.hyperflux'

/**
 * Automatically synchronises specific root paths of a hyperflux state definition with the localStorage.
 * Values get automatically populated if they exist in localStorage and saved when they are changed.
 * @param {StateDefinition} stateDefinition
 * @param {string[]} keys the root paths to synchronise
 *
 * TODO: #7384 this api need to be revisited; we are syncing local state without doing any validation,
 * so if we ever change the acceptable values for a given state key, we will have to do a migration
 * or fallback to a default value, but we can't do that without knowing what the acceptable values are, which means
 * we need to pass in a schema or validator function to this function (we should use ts-pattern for this).
 */
export const syncStateWithLocalStorage = (stateDefinition: ReturnType<typeof defineState<any>>, keys: string[]) => {
  if (isNode) return
  const state = getState(stateDefinition)

  for (const key of keys) {
    const storedValue = localStorage.getItem(`${stateNamespaceKey}.${stateDefinition.name}.${key}`)
    if (storedValue !== null && storedValue !== 'undefined') state[key].set(JSON.parse(storedValue))
  }

  state.attach(() => ({
    id: Symbol('syncStateWithLocalStorage'),
    init: () => ({
      onSet(arg) {
        for (const key of keys) {
          if (state[key].value === undefined)
            localStorage.removeItem(`${stateNamespaceKey}.${stateDefinition.name}.${key}`)
          else
            localStorage.setItem(
              `${stateNamespaceKey}.${stateDefinition.name}.${key}`,
              JSON.stringify(state[key].get({ noproxy: true }))
            )
        }
      }
    })
  }))
}
