import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

import { MailClient } from './../../mocks'

const emailInput = ReactSelector('Login TextInputWithButton').withProps({
  type: 'email',
})
const otpInput = ReactSelector('Login TextInputWithButton').withProps({
  type: 'tel',
})
const errorBlock = ReactSelector('Login ErrorBlock')

/**
 * Retrieve OTP from the email sent to MailDev server
 * @param toEmail Emaill address used for login
 */
const getOtp = async (toEmail: string): Promise<string> => {
  let latestEmail: any
  try {
    latestEmail = await MailClient.getLatestEmail(toEmail)
    const otp = latestEmail.html.match(/\d{6}/)[0]
    return otp
  } catch (err) {
    throw new Error('Unable to find OTP')
  } finally {
    if (latestEmail) {
      await MailClient.deleteById(latestEmail.id)
    }
  }
}

/**
 * Login user using email
 * @param email
 * @throws Error When email is invalid or login failed
 */
const login = async (email: string): Promise<void> => {
  await t.typeText(emailInput, email).pressKey('enter')
  const hasError = await errorBlock.hasChildNodes
  if (hasError) {
    const errorMsg = await errorBlock.textContent
    throw new Error(errorMsg)
  }

  const otp = await getOtp(email)
  await t.typeText(otpInput, otp).pressKey('enter')
}

export const LoginPage = {
  login,
}
