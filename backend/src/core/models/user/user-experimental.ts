import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { User } from './user'

@Table({
  tableName: 'user_experimental',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      name: 'unique_user_id_per_feature',
      unique: true,
      fields: ['user_id', 'feature'],
    },
  ],
})
export class UserExperimental extends Model<UserExperimental> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  userId: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  feature: string

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: object
}
