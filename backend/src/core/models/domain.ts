import config from '@core/config'
import {
  DataType,
  Model,
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  HasMany,
  BeforeCreate,
} from 'sequelize-typescript'
import { CreateOptions } from 'sequelize/types'
import { Agency } from './agency'
import { User } from './user/user'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

@Table({ tableName: 'domains', underscored: true, timestamps: true })
export class Domain extends Model<Domain> {
  @HasMany(() => User, { as: 'user' })
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  domain!: string

  @ForeignKey(() => Agency)
  @Column(DataType.INTEGER)
  agencyId?: number

  @BelongsTo(() => Agency)
  agency?: Agency

  // When a domain is created (i.e. a new user's domain is not recognised)
  // By default, find (or create) agency with default name and populate foreign key with that value
  @BeforeCreate
  static async populateAgency(
    instance: Domain,
    options: CreateOptions
  ): Promise<void> {
    logger.info({
      message: `Creating new domain ${instance.domain}`,
    })

    const [agency] = await Agency.findOrCreate({
      where: {
        name: config.get('defaultAgency.name'),
      },
      transaction: options.transaction,
    })
    instance.agencyId = agency.id
  }
}
