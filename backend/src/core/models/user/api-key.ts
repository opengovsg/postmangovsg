import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { User } from './user'

@Table({ tableName: 'api_keys', underscored: true, timestamps: true })
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
}
