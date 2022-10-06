import config from '@core/config'
import {
  Column,
  DataType,
  Model,
  Table,
  BeforeCreate,
  HasMany,
  HasOne,
  AfterCreate,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { UserCredential } from '@core/models'
import { UserDemo } from './user-demo'
import { UserFeature } from '@core/models'
import { ApiKeyService } from '@core/services'
import { validateDomain } from '@core/utils/validate-domain'
import { CreateOptions } from 'sequelize/types'
import { Domain } from '../domain'
import { Agency } from '../agency'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

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
  email!: string

  @Column(DataType.STRING)
  apiKey?: string

  @HasMany(() => UserCredential)
  creds!: UserCredential[]

  @HasOne(() => UserDemo)
  demo!: UserDemo

  @HasOne(() => UserFeature)
  userFeature!: UserFeature

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  emailDomain?: string

  @BelongsTo(() => Domain)
  domain?: Domain

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
  async regenerateAndSaveApiKey(): Promise<string> {
    const name = this.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
    const apiKeyPlainText = ApiKeyService.generateApiKeyFromName(name)
    const apiKeyHash = await ApiKeyService.getApiKeyHash(apiKeyPlainText)
    this.apiKey = apiKeyHash
    await this.save()
    return apiKeyPlainText
  }
}
