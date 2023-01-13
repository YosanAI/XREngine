import { DataTypes, Model, Sequelize } from 'sequelize'

import { AnimationInterface } from '@xrengine/common/src/dbmodels/Animation'

import { Application } from '../../../declarations'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const animation = sequelizeClient.define<Model<AnimationInterface>>(
    'animation',
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

  ;(animation as any).associate = (models: any): void => {
    ;(animation as any).belongsTo(models.static_resource, {
      foreignKey: 'src',
      required: true
    })
    ;(animation as any).belongsTo(models.rig, {
      foreignKey: 'rig',
      required: true
    })
  }

  return animation
}
