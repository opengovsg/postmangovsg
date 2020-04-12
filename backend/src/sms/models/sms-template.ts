import { BeforeCreate, BeforeUpdate, BeforeUpsert, BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'

@Table({ tableName: 'sms_templates' , underscored: true, timestamps: true })
export class SmsTemplate extends Model<SmsTemplate> {
  @ForeignKey(() => Campaign)
  @Column({
    type:DataType.INTEGER,
    primaryKey: true,
  })
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column({
    type: DataType.TEXT,
  })
  body?: string

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  params?: Array<String>

  @BeforeUpdate
  @BeforeCreate
  @BeforeUpsert
  static generateParams(instance: SmsTemplate) {
    // stubbed
    instance.params = ['name', 'event']
  }

}