import { waitForReact } from 'testcafe-react-selectors'
import { LandingPage, LoginPage } from './page-models'
import { generateRandomEmail, getPageUrl } from './helpers'
import config from './../config'

fixture`Login Page`.page(config.get('frontendUrl')).beforeEach(async () => {
  await waitForReact()
})

test('Login', async (t) => {
  await LandingPage.selectLogin()
  await LoginPage.login(generateRandomEmail())

  await t.expect(getPageUrl()).contains('/campaigns')
})

test('Failed login', async (t) => {
  try {
    await LandingPage.selectLogin()
    await LoginPage.login('test@gmail.com')
  } catch (err) {
    await t.expect(err.message).contains('not authorized')
  }

  await t.expect(getPageUrl()).contains('/login')
})
