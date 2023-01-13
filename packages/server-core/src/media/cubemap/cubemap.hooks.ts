import { disallow, iff, isProvider } from 'feathers-hooks-common'

import collectAnalytics from '@xrengine/server-core/src/hooks/collect-analytics'
import replaceThumbnailLink from '@xrengine/server-core/src/hooks/replace-thumbnail-link'
import attachOwnerIdInQuery from '@xrengine/server-core/src/hooks/set-loggedin-user-in-query'

import addAssociations from '../../hooks/add-associations'
import authenticate from '../../hooks/authenticate'
import verifyScope from '../../hooks/verify-scope'

export default {
  before: {
    all: [],
    find: [
      collectAnalytics(),
      addAssociations({
        models: [
          {
            model: 'static-resource'
          }
        ]
      })
    ],
    get: [disallow('external')],
    create: [authenticate(), verifyScope('admin', 'admin')],
    update: [authenticate(), verifyScope('admin', 'admin')],
    patch: [authenticate(), verifyScope('admin', 'admin')],
    remove: [authenticate(), verifyScope('admin', 'admin')]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
} as any
