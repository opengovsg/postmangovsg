import { convertToSGTLocaleString } from '@/core/util/date'

export type WhenExpire = 'four weeks' | 'two weeks' | 'three days' | 'one day'

export const reminderEmailBodyGenerator = (
  whenExpire: WhenExpire,
  apiKeyLabel: string,
  lastFive: string,
  validUntil: string,
  apiEmailAddress: string,
) => {
  switch (whenExpire) {
    case 'four weeks':
    case 'two weeks':
    case 'three days':
    case 'one day':
      return `Hi there,
      <br><br>
      The email address <b>${apiEmailAddress}</b> has an API key on Postman that is expiring soon. <b>Please renew your API key as soon as possible to avoid disruption to your service.</b>
      <br><br>
      You have been listed as a contact for the API key "<b>${apiKeyLabel}</b>" with the following last five characters: <b>${lastFive}</b>. This API key will be expiring on <b>${convertToSGTLocaleString(
        validUntil,
      )} (SGT)</b>.
      <br><br>
      ${
        whenExpire === 'one day'
          ? ' <b>THIS IS THE LAST REMINDER EMAIL.</b> We will not be accountable for any disruption to your service if you do not renew your API key in time.'
          : ''
      }
      <br><br>
      For more info on how to renew your API key, please refer to our <a href="https://guide.postman.gov.sg/api-guide/api-key-management/rotate-your-api-key">documentation</a>.
      <br><br>
      Thank you!
      <br><br>
      Best regards,<br>
      Postman team`
    default: {
      const exhaustiveCheck: never = whenExpire
      throw new Error(`Unhandled status: ${exhaustiveCheck}`)
    }
  }
}

export const reminderEmailSubjectGenerator = (
  whenExpire: 'four weeks' | 'two weeks' | 'three days' | 'one day',
) => {
  switch (whenExpire) {
    case 'four weeks':
    case 'two weeks':
      return `Reminder: Your Postman API key will expire in ${whenExpire}!`
    case 'three days':
    case 'one day':
      return `URGENT: Your Postman API key will expire in ${whenExpire}!`
    default: {
      const exhaustiveCheck: never = whenExpire
      throw new Error(`Unhandled status: ${exhaustiveCheck}`)
    }
  }
}
