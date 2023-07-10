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
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: string

  // composite unique index on templateId and userId to ensure
  // (1) no duplicate entries
  // (2) fast lookup
  @ForeignKey(() => GovsgTemplate)
  @Column(DataType.BIGINT)
  templateId: number

  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, allowNull: false })
  userId: string
}
