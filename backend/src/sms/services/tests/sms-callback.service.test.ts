import bcrypt from 'bcrypt'
import config from '@core/config'
import { SmsCallbackService } from '@sms/services'
import { getSha256Hash } from '@shared/utils/crypto'

const basic = (username: string, password: string) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

describe('SmsCallbackService.isAuthenticated', () => {
  const messageId = '7'
  const campaignId = '3'

  test('accepts the HMAC the worker signs for this message and campaign', () => {
    const username = 'abc123'
    const password = getSha256Hash(
      config.get('smsCallback.callbackSecret'),
      username + messageId + campaignId
    )
    expect(
      SmsCallbackService.isAuthenticated(
        messageId,
        campaignId,
        basic(username, password)
      )
    ).toBe(true)
    expect(
      SmsCallbackService.isAuthenticated(
        '8',
        campaignId,
        basic(username, password)
      )
    ).toBe(false)
  })

  test('rejects a bcrypt hash computed without the callback secret', () => {
    const username = 'a'.repeat(72)
    expect(
      SmsCallbackService.isAuthenticated(
        messageId,
        campaignId,
        basic(username, bcrypt.hashSync(username, 4))
      )
    ).toBe(false)
  })
})
