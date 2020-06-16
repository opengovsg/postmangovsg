import { Column, Model, Table, DataType } from 'sequelize-typescript'

@Table({
  tableName: 'telegram_subscribers',
  underscored: true,
  timestamps: true,
})
export class TelegramSubscriber extends Model<TelegramSubscriber> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    unique: true,
  })
  phoneNumber!: string

  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    unique: true,
  })
  telegramId!: number
}
