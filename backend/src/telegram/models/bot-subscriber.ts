import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { TelegramSubscriber } from './telegram-subscriber'

@Table({ tableName: 'bot_subscribers', underscored: true, timestamps: true })
export class BotSubscriber extends Model<BotSubscriber> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  botId!: string

  @ForeignKey(() => TelegramSubscriber)
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  telegramId!: number
}
