import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  Default,
} from 'sequelize-typescript'
import { User } from './user'

@Table({ tableName: 'user_trials', underscored: true, timestamps: true })
export class UserTrial extends Model<UserTrial> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId!: number

  @Default(3)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  numTrialsSms!: string
}
