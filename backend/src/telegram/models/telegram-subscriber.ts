import { Column, Model, Table, DataType, HasMany } from 'sequelize-typescript'
import { BotSubscriber } from './bot-subscriber'

@Table({
  tableName: 'telegram_subscribers',
  underscored: true,
  timestamps: true,
})
export class TelegramSubscriber extends Model<TelegramSubscriber> {
  @HasMany(() => BotSubscriber, { as: 'bot_subscriber' })
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  telegramId!: number

  @Column({
    type: DataType.STRING,
  })
  phoneNumber!: string
}
