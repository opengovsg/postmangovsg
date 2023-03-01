import config from '@core/config'
import {
  AfterCreate,
  BeforeCreate,
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  Table,
} from 'sequelize-typescript'
import { List, UserCredential, UserFeature, UserList } from '@core/models'
import { UserDemo } from './user-demo'
import { validateDomain } from '@core/utils/validate-domain'
import { CreateOptions } from 'sequelize/types'
import { Domain } from '../domain'
import { Agency } from '../agency'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

export const DEFAULT_TX_EMAIL_RATE_LIMIT = 10

@Table({ tableName: 'users', underscored: true, timestamps: true })
export class User extends Model<User> {
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
      isLowercase: true,
    },
    unique: true,
  })
  email: string

  @Column({ type: DataType.STRING, allowNull: true })
  apiKeyHash: string | null

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_TX_EMAIL_RATE_LIMIT,
  })
  rateLimit: number

  @HasMany(() => UserCredential)
  creds: UserCredential[]

  @HasOne(() => UserDemo)
  demo: UserDemo

  @HasOne(() => UserFeature)
  userFeature: UserFeature

  @ForeignKey(() => Domain)
  @Column({ type: DataType.STRING, allowNull: true })
  emailDomain: string | null

  @BelongsTo(() => Domain)
  domain: Domain

  @BelongsToMany(() => List, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    through: () => UserList,
    as: 'lists',
  })
  lists: Array<List & { UserList: UserList }>

  // Wrapper function around validation and population of domains
  // to enforce that validation happens before creation of user
  @BeforeCreate
  static async validateAndPopulateDomain(
    instance: User,
    options: CreateOptions
  ): Promise<void> {
    await this.validateEmail(instance, options)
    await this.populateDomain(instance, options)
  }

  // Helper function called in the BeforeCreate hook above
  // During programmatic creation of users (users signing up by themselves), emails must end in a whitelisted domain
  // If we manually insert the user into the database, then this hook is bypassed.
  // This enables us to whitelist specific emails that do not end in a whitelisted domain, which can sign in, but not sign up.
  // Since updating of email is never done programtically, we are not adding this as a BeforeUpdate hook
  static async validateEmail(
    instance: User,
    options: CreateOptions
  ): Promise<void> {
    const endsInWhitelistedDomain = await validateDomain(
      instance.email,
      options.transaction
    )
    if (!endsInWhitelistedDomain) {
      throw new Error(
        `User email ${instance.email} does not end in a whitelisted domain`
      )
    }
  }

  // Helper function called in the BeforeCreate hook above
  // Look for user's email domain in domains table and create entry if it doesn't exist
  // Finally, populate user's foreign key on domains table
  static async populateDomain(
    instance: User,
    options: CreateOptions
  ): Promise<void> {
    const emailDomain = instance.email.substring(
      instance.email.lastIndexOf('@')
    )

    const domain = await Domain.findOne({
      where: { domain: emailDomain },
      transaction: options.transaction,
    })

    // If domain doesn't exist, create it in the database with the default Agency value
    if (domain == null) {
      logger.info({
        message: `Creating new domain ${emailDomain}`,
        action: 'populateDomain',
        email: instance.email,
        domain: emailDomain,
      })

      const [defaultAgency] = await Agency.findOrCreate({
        where: {
          name: config.get('defaultAgency.name'),
        },
        transaction: options.transaction,
      })
      await Domain.create(
        {
          domain: emailDomain,
          agencyId: defaultAgency.id,
        } as Domain,
        { transaction: options.transaction }
      )
    }

    instance.emailDomain = emailDomain
  }

  @AfterCreate
  static addUserDemo(
    instance: User,
    options: CreateOptions
  ): Promise<[UserDemo, boolean]> {
    return UserDemo.findOrCreate({
      where: { userId: instance.id },
      transaction: options.transaction,
    })
  }
}
