import { BelongsTo, Column, DataType, ForeignKey, Model, Table, HasMany, HasOne } from 'sequelize-typescript'
import { ChannelType } from '@core/constants'
import { CampaignS3ObjectInterface } from '@core/interfaces'
import { Credential } from './credential'
import { User } from './user'
import { JobQueue } from './job-queue'
import { Statistic } from './statistic'
import { EmailTemplate } from '@email/models'
import { SmsTemplate } from '@sms/models'

@Table({ tableName: 'campaigns', underscored: true, timestamps: true })
export class Campaign extends Model<Campaign> {
  @HasMany(() => JobQueue, { as: 'job_queue' })
  @HasOne(() => EmailTemplate, { as: 'email_templates' })
  @HasOne(() => SmsTemplate, { as: 'sms_templates' })
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId!: number

  @BelongsTo(() => User)
  user!: User

  @Column({
    type: DataType.ENUM(...Object.values(ChannelType)),
    allowNull: false,
  })
  type!: ChannelType

  @ForeignKey(() => Credential)
  @Column(DataType.STRING)
  credName?: string

  @BelongsTo(() => Credential)
  credential?: Credential

  @Column(DataType.JSON)
  s3Object?: CampaignS3ObjectInterface

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  valid!: boolean

  @HasOne(() => Statistic)
  statistic?: Statistic
}
