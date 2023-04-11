import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { User } from './user'

@Table({
  tableName: 'api_keys',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class ApiKey extends Model<ApiKey> {
  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, allowNull: false })
  userId: string

  @Column({ type: DataType.STRING, allowNull: false })
  hash: string

  @Column({ type: DataType.STRING, allowNull: false })
  label: string

  @Column({ type: DataType.STRING, allowNull: false })
  lastFive: string

  @Column({ type: DataType.DATE, allowNull: false })
  validUntil: Date

  // we're enforcing not-null only for new keys via application logic
  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  notificationAddresses: string[]
}
