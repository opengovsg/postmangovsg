import { Column, DataType, Model, Table, BeforeUpdate, BeforeCreate, HasMany } from 'sequelize-typescript'
import { UserCredential } from './user-credential'
import { ApiKeyService } from '@core/services'
import { validateDomain } from '@core/utils/validate-domain'

@Table({ tableName: 'users', underscored: true, timestamps: true })
export class User extends Model<User> {

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
      isLowercase: true,
    },
  })
  email!: string

  @Column(DataType.STRING)
  apiKey?: string

  @HasMany(() => UserCredential)
  creds!: UserCredential[]

  // During programmatic creation of users (users signing up by themselves), emails must end in a whitelisted domain
  // If we manually insert the user into the database, then this hook is bypassed.
  // This enables us to whitelist specific emails that do not end in a whitelisted domain, which can sign in, but not sign up.
  @BeforeUpdate
  @BeforeCreate
  static validateEmail(instance: User): void {
    if (!validateDomain(instance.email)) {
      throw new Error(`User email ${instance.email} does not end in a whitelisted domain`)
    }
  }

  async regenerateAndSaveApiKey(): Promise<string> {
    const name = this.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
    const apiKeyPlainText = ApiKeyService.generateApiKeyFromName(name)
    const apiKeyHash = await ApiKeyService.getApiKeyHash(apiKeyPlainText)
    this.apiKey = apiKeyHash
    this.save()
    return apiKeyPlainText
  }
}
