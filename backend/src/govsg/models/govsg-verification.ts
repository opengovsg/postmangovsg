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
  @Column(DataType.BIGINT)
  govsgMessageId: number

  @Column({ type: DataType.STRING, allowNull: true })
  passcodeCreationWamid: string | null

  @Column(DataType.STRING)
  passcode: string
}
