import { Campaign } from '@core/models/campaign'
import { SmsTemplateService } from '@sms/services'
import {
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

@Table({ tableName: 'sms_templates', underscored: true, timestamps: true })
export class SmsTemplate extends Model<SmsTemplate> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
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
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  params?: Array<string>

  // Does not work with beforeUpsert
  // @see https://github.com/RobinBuschmann/sequelize-typescript/blob/883cb2c92c09160a82b9a39fb0c33b6b12a4051c/test/specs/hooks/hooks.spec.ts#L97
  @BeforeUpdate
  @BeforeCreate
  static generateParams(instance: SmsTemplate): void {
    if (!instance.body) return
    const parsedTemplate = SmsTemplateService.client.parseTemplate(
      instance.body
    )
    instance.params = parsedTemplate.variables
  }
}
