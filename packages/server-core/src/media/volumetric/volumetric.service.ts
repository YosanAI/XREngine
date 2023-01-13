import { VolumetricInterface } from '@xrengine/common/src/dbmodels/Volumetric'

import { Application } from '../../../declarations'
import { Volumetric } from './volumetric.class'
import volumetricDocs from './volumetric.docs'
import hooks from './volumetric.hooks'
import createModel from './volumetric.model'

declare module '@xrengine/common/declarations' {
  interface ServiceTypes {
    volumetric: Volumetric
  }
  interface Models {
    volumetric: ReturnType<typeof createModel> & VolumetricInterface
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
  const event = new Volumetric(options, app)
  event.docs = volumetricDocs

  app.use('volumetric', event)

  /**
   * Get our initialized service so that we can register hooks
   */
  const service = app.service('volumetric')

  service.hooks(hooks)
}
