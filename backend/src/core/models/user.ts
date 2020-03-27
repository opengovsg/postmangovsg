import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      is: /^.*\.gov\.sg$/,
      isLowercase: true,
    },
  })
  email!: string
}