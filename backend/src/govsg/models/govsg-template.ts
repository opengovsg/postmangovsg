import { Campaign } from '@core/models'
import {
  BelongsToMany,
  Column,
  DataType,
  Model,
  Table,
} from 'sequelize-typescript'
import { CampaignGovsgTemplate } from './campaign-govsg-template'

@Table({ tableName: 'govsg_templates', underscored: true, timestamps: true })
export class GovsgTemplate extends Model<GovsgTemplate> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number

  @BelongsToMany(() => Campaign, {
    through: { model: () => CampaignGovsgTemplate },
  })
  campaigns: Array<Campaign>

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  body?: string

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  params: Array<string> | null

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: true,
  })
  whatsappTemplateLabel: string | null

  @Column({
    type: DataType.TEXT,
  })
  name: string
}
