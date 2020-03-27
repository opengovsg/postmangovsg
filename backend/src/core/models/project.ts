import { BelongsTo, Column, DataType, ForeignKey, Model, Table, HasMany } from 'sequelize-typescript'
import { User } from './user'
// import { WhatsappContent } from './whatsapp-content'

export enum PROJECT_TYPE {
  EMAIL = 'email',
  SMS = 'sms'
}

@Table({ tableName: 'projects' })
export class Project extends Model<Project> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string

  @Column({
    type: DataType.ENUM(...Object.values(PROJECT_TYPE)),
    allowNull: false,
  })
  type!: PROJECT_TYPE

  @ForeignKey(() => User)
  @Column
  userId!: number

  @Column(DataType.STRING)
  credential?: string

  @BelongsTo(() => User)
  user!: User
}