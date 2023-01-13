import { DataTypes, Model, Sequelize } from 'sequelize'

import { VolumetricInterface } from '@xrengine/common/src/dbmodels/Volumetric'

import { Application } from '../../../declarations'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const volumetric = sequelizeClient.define<Model<VolumetricInterface>>(
    'volumetric',
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

  ;(volumetric as any).associate = (models: any): void => {
    ;(volumetric as any).belongsTo(models.static_resource, {
      foreignKey: 'src',
      required: true
    })
    ;(volumetric as any).belongsTo(models.image, {
      foreignKey: 'thumbnail'
    })
  }

  return volumetric
}
