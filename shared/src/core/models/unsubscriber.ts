import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { Campaign } from 'core/models/campaign'

@Table({
  tableName: 'unsubscribers',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class Unsubscriber extends Model<Unsubscriber> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  recipient!: string

  @Column(DataType.DATE)
  sentAt?: Date

  @Column({
    type: DataType.STRING,
  })
  reason?: string

  @Column(DataType.DATE)
  deletedAt?: Date | null
}
