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

import { Campaign } from '../../models/campaign'
import { TemplateClient, XSS_SMS_OPTION } from '../../../templating'

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
    const templateClient = new TemplateClient({ xssOptions: XSS_SMS_OPTION })
    const parsedTemplate = templateClient.parseTemplate(instance.body)
    instance.params = parsedTemplate.variables
  }
}
