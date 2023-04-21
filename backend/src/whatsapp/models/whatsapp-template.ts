import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { Credential } from '@core/models/credential'

// whatsapp templates work a little differently from normal templates
// whatsapp templates do not belong to any specific campaigns
// but are pulled and mirrored from pre-approved templates over at whatsapp

// instead, whatsapp templates belong to a specific set of credentials (i.e.e WABA id)
@Table({ tableName: 'whatsapp_templates', underscored: true, timestamps: true })
export class WhatsappTemplate extends Model<WhatsappTemplate> {
  // @HasMany(() => Campaign, { as: 'campaign' })
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @ForeignKey(() => Credential)
  @Column(DataType.STRING)
  credName!: string | null

  @BelongsTo(() => Credential)
  credential?: Credential

  // this is the name of the template, should be the same as the one of whatsapp business manager
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  whatsappTemplateLabel!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  body?: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  subject?: string

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  params?: Array<string>
}
