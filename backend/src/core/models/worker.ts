import { Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'workers' })
export class Worker extends Model<Worker> {}