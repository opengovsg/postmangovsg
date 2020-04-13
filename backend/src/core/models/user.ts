import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'users' , underscored: true, timestamps: true })
export class User extends Model<User> {
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
      is: /^.*\.gov\.sg$/,
      isLowercase: true,
    },
  })
  email!: string

  @Column(DataType.STRING)
  apiKey?: string
}