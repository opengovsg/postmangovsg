import {
  BelongsTo,
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

  @BelongsTo(() => GovsgTemplate)
  govsgTemplate: GovsgTemplate

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, primaryKey: true, allowNull: false })
  userId: number

  @BelongsTo(() => User)
  user: User
}
