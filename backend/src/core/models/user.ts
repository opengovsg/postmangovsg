import { Column, DataType, Model, Table, BeforeUpdate, BeforeCreate } from 'sequelize-typescript'

@Table({ tableName: 'users' , underscored: true, timestamps: true })
export class User extends Model<User> {
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
      isLowercase: true,
    },
  })
  email!: string

  @Column(DataType.STRING)
  apiKey?: string

  // During programmatic creation of users (users signing up by themselves), emails must end in .gov.sg
  // If we manually insert the user into the database, then this hook is bypassed.
  // This enables us to whitelist specific non .gov.sg emails, which can sign in, but not sign up.
  @BeforeUpdate
  @BeforeCreate
  static validateEmail(instance: User): void {
    if(!/^.*\.gov\.sg$/.test(instance.email)){
      throw new Error(`User email ${instance.email} does not end in .gov.sg`)
    }
  }

}
