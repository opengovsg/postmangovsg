import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { GovsgTemplate } from './govsg-template'
import { User } from '@core/models'

@Table({
  tableName: 'govsg_templates_access',
  underscored: true,
  timestamps: true,
})
export class GovsgTemplatesAccess extends Model<GovsgTemplatesAccess> {
  @ForeignKey(() => GovsgTemplate)
  @Column({ type: DataType.BIGINT, primaryKey: true, allowNull: false })
  templateId: number

  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, primaryKey: true, allowNull: false })
  userId: string
}
