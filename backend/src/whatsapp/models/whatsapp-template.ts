import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'whatsapp_templates', underscored: true, timestamps: true })
export class WhatsappTemplate extends Model<WhatsappTemplate> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

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
