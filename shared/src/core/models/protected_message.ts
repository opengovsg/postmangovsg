import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { Campaign } from '@shared_models/campaign'

@Table({ tableName: 'protected_messages', underscored: true, timestamps: true })
export class ProtectedMessage extends Model<ProtectedMessage> {
  @Column({
    primaryKey: true,
    type: DataType.STRING,
  })
  id!: string

  @ForeignKey(() => Campaign)
  @Column(DataType.INTEGER)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column(DataType.TEXT)
  payload!: string

  @Column(DataType.STRING)
  passwordHash!: string

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  version!: number
}
