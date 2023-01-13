import { DataTypes, Model, Sequelize } from 'sequelize'

import { AudioInterface } from '@xrengine/common/src/dbmodels/Audio'

import { Application } from '../../../declarations'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const audio = sequelizeClient.define<Model<AudioInterface>>(
    'audio',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING)
      },
      duration: {
        type: DataTypes.INTEGER
      }
    },
    {
      hooks: {
        beforeCount(options: any): void {
          options.raw = true
        }
      }
    }
  )

  ;(audio as any).associate = (models: any): void => {
    ;(audio as any).belongsTo(models.static_resource, {
      foreignKey: 'src',
      required: true
    })
  }

  return audio
}
