import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ChannelType } from '@core/constants'
import { CampaignS3ObjectInterface } from '@core/interfaces'
import { Credential } from './credential'
import { User } from './user'

@Table({ tableName: 'campaigns' , underscored: true, timestamps: true })
export class Campaign extends Model<Campaign> {
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
}