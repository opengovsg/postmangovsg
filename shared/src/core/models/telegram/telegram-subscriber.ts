import { Column, Model, Table, DataType, HasMany } from 'sequelize-typescript'
import { BotSubscriber } from './index'

@Table({
  tableName: 'telegram_subscribers',
  underscored: true,
  timestamps: true,
})
export class TelegramSubscriber extends Model<TelegramSubscriber> {
  @HasMany(() => BotSubscriber, {
    as: 'bot_subscriber',
    sourceKey: 'telegramId',
  })
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  phoneNumber!: string

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    unique: true,
  })
  telegramId!: number
}
