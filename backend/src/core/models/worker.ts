import { Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'workers' , underscored: true, timestamps: true })
export class Worker extends Model<Worker> {}