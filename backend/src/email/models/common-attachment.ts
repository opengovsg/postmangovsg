import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({
  tableName: 'common_attachments',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class CommonAttachment extends Model<CommonAttachment> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  id!: string

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  originalFileName: string

  @Column(DataType.JSONB)
  metadata: {
    size: number
    type: string
    hash: string
  }
}
