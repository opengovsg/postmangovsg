import {
  BeforeCreate,
  BeforeUpdate,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { union } from 'lodash'
import { Campaign } from '@shared/core/models/campaign'
import { TemplateClient, XSS_EMAIL_OPTION } from '../../../templating'

@Table({ tableName: 'email_templates', underscored: true, timestamps: true })
export class EmailTemplate extends Model<EmailTemplate> {
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
    type: DataType.TEXT,
  })
  subject?: string

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  params?: Array<string>

  @Column({
    type: DataType.TEXT,
  })
  replyTo?: string

  @Column({
    type: DataType.TEXT,
  })
  from?: string

  @Column({
    type: DataType.BOOLEAN,
  })
  showLogo!: boolean

  // Does not work with beforeUpsert
  // @see https://github.com/RobinBuschmann/sequelize-typescript/blob/883cb2c92c09160a82b9a39fb0c33b6b12a4051c/test/specs/hooks/hooks.spec.ts#L97
  @BeforeUpdate
  @BeforeCreate
  static generateParams(instance: EmailTemplate): void {
    const templateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
    if (!instance.body) return
    if (!instance.subject) return
    const parsedTemplateVariables = templateClient.parseTemplate(
      instance.body
    ).variables
    const parsedSubjectVariables = templateClient.parseTemplate(
      instance.subject
    ).variables
    instance.params = union(parsedTemplateVariables, parsedSubjectVariables)
  }
}
