import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

const loginButton = ReactSelector('Landing PrimaryButton').withText('Sign in')

/**
 * Select login button from landing page
 */
const selectLogin = async (): Promise<void> => {
  await t.click(loginButton)
}

export const LandingPage = {
  selectLogin,
}
