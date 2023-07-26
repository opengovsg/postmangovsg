import {
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

  @ForeignKey(() => GovsgMessage)
  @Column({ type: DataType.BIGINT, allowNull: false })
  govsgMessageId: number

  @Column({ type: DataType.STRING, allowNull: false })
  passcodeCreationWamid: string

  @Column({ type: DataType.STRING, allowNull: false })
  passcode: string
}
