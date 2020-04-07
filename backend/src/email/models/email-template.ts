import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'

@Table({ tableName: 'email_templates' })
export class EmailTemplate extends Model<EmailTemplate> {
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
  body!: string

  @Column({
    type: DataType.TEXT,
  })
  subject!: string
}