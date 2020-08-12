import { waitForReact } from 'testcafe-react-selectors'
import {
  CampaignsPage,
  CreateModalPage,
  LandingPage,
  LoginPage,
  SmsCampaignPage,
  ProgressDetailsPage,
} from './../page-models'
import { MailClient, getPageUrl, generateRandomEmail } from './../helpers'
import config from './../config'

fixture`SMS campaigns`
  .page(config.get('frontendUrl'))
  .beforeEach(async (t) => {
    const email = generateRandomEmail()
    t.ctx.email = email

    await waitForReact()
    await LandingPage.selectLogin()
    await LoginPage.login(email)

    // Check to ensure we've logged in
    await t.expect(getPageUrl()).contains('/campaigns')
  })
  .afterEach(async () => {
    await MailClient.deleteAll()
  })

test('Create SMS campaign', async () => {
  await CampaignsPage.selectCreateCampaign()
  await CreateModalPage.createCampaign('sms', 'SMS')

  await SmsCampaignPage.createTemplate({
    body: 'This is a test message',
  })
  await SmsCampaignPage.uploadRecipient({
    filename: './../files/sms.csv',
  })
  await SmsCampaignPage.enterAndValidateNewCredentials({
    ...config.get('testCredentials.sms'),
    phoneNumber: '91234567',
  })
  await SmsCampaignPage.sendCampaign()
  await ProgressDetailsPage.checkStatistics({
    error: 2,
    sent: 4,
    invalid: 0,
  })
})
