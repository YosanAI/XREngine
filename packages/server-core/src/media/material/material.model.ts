import { DataTypes, Model, Sequelize } from 'sequelize'

import { MaterialInterface } from '@xrengine/common/src/dbmodels/Material'

import { Application } from '../../../declarations'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const material = sequelizeClient.define<Model<MaterialInterface>>(
    'material',
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

  ;(material as any).associate = (models: any): void => {
    ;(material as any).belongsTo(models.static_resource, {
      foreignKey: 'src',
      required: true
    })
    ;(material as any).belongsTo(models.image, {
      foreignKey: 'thumbnail',
      required: true
    })
  }

  return material
}
