import { Model, Table } from 'sequelize-typescript'
import { GovsgMessage } from './govsg-message'

@Table({ tableName: 'govsg_ops', underscored: true, timestamps: true })
export class GovsgOp extends Model<GovsgMessage> {}
