import { ModelInterface } from '@xrengine/common/src/dbmodels/Model'

import { Application } from '../../../declarations'
import authenticate from '../../hooks/authenticate'
import verifyScope from '../../hooks/verify-scope'
import { Model } from './model.class'
import modelDocs from './model.docs'
import hooks from './model.hooks'
import createModel from './model.model'

declare module '@xrengine/common/declarations' {
  interface ServiceTypes {
    model: Model
  }
  interface Models {
    model: ReturnType<typeof createModel> & ModelInterface
  }
}

export default (app: Application) => {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    multi: true
  }

  /**
   * Initialize our service with any options it requires and docs
   */
  const event = new Model(options, app)
  event.docs = modelDocs

  app.use('model', event)

  /**
   * Get our initialized service so that we can register hooks
   */
  const service = app.service('model')

  service.hooks(hooks)
}
