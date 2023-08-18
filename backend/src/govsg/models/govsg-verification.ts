import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { GovsgMessage } from './govsg-message'

@Table({ tableName: 'govsg_verification', underscored: true, timestamps: true })
export class GovsgVerification extends Model<GovsgVerification> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number

  @BelongsTo(() => GovsgMessage)
  govsgMessage: GovsgMessage

  @ForeignKey(() => GovsgMessage)
  @Column({ type: DataType.BIGINT, allowNull: false })
  govsgMessageId: number

  @Column({ type: DataType.STRING })
  passcodeCreationWamid: string

  @Column({ type: DataType.STRING, allowNull: false })
  passcode: string

  @Column({ type: DataType.DATE, allowNull: true })
  userClickedAt: Date | null
}
