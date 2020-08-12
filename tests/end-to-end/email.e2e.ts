import { waitForReact } from 'testcafe-react-selectors'
import {
  CreateModalPage,
  EmailCampaignPage,
  CampaignsPage,
  LandingPage,
  LoginPage,
  ProgressDetailsPage,
  ProtectedPage,
} from './page-models'
import { MailClient } from './../mocks'
import { getPageUrl, generateRandomEmail } from './helpers'
import config from './../config'

fixture`Email campaigns`
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

test('Create email campaign', async (t) => {
  const { email } = t.ctx
  await CampaignsPage.selectCreateCampaign()
  await CreateModalPage.createCampaign('email', 'Email')

  await EmailCampaignPage.createTemplate({
    subject: 'Test Email',
    body: 'Hello world',
    replyTo: email,
  })
  await EmailCampaignPage.uploadRecipient({
    filename: './../files/email.csv',
  })
  await EmailCampaignPage.sendValidationEmail(email)
  await EmailCampaignPage.sendCampaign()
  await ProgressDetailsPage.checkStatistics({
    error: 0,
    sent: 1,
    invalid: 0,
  })
})

test('Create protected email campaign', async (t) => {
  const { email } = t.ctx
  await CampaignsPage.selectCreateCampaign()
  await CreateModalPage.createCampaign('protect', 'Email', true)

  await EmailCampaignPage.createTemplate({
    subject: 'Test Email',
    body: 'This is the protected link {{protectedlink}}',
    replyTo: email,
  })

  await EmailCampaignPage.createProtectedTemplate({
    body: 'This is a secret message',
    filename: './../files/protected-email.csv',
  })
  await EmailCampaignPage.sendValidationEmail(email)
  await EmailCampaignPage.sendCampaign()
  await ProgressDetailsPage.checkStatistics({
    error: 0,
    sent: 1,
    invalid: 0,
  })

  const { html } = await MailClient.getLatestEmail('test@open.gov.sg')
  const protectedLink = html.match(/(https?:\/\/[^ ]*)/g)[0]
  await t.navigateTo(protectedLink)

  try {
    await ProtectedPage.enterPassword('wrong')
  } catch (err) {
    await t.expect(err.message).contains('Wrong password')
  }

  await ProtectedPage.enterPassword('password')
  const preview = await ProtectedPage.getProtectedMessage()
  await t.expect(preview).contains('This is a secret message')
})
