import { waitForReact } from 'testcafe-react-selectors'
import {
  CampaignsPage,
  CreateModalPage,
  LandingPage,
  LoginPage,
  TelegramCampaignPage,
  ProgressDetailsPage,
} from './../page-models'
import {
  TelegramClient,
  MailClient,
  getPageUrl,
  generateRandomEmail,
} from './../helpers'
import config from './../config'

fixture`Telegram campaigns`
  .page(config.get('frontendUrl'))
  .beforeEach(async (t) => {
    const email = generateRandomEmail()
    const botId = 11111111
    const botToken = `${botId}:thisisadummybottoken`
    const telegramId = 123456
    const phoneNumber = '+6591234567'
    await TelegramClient.addSubscriber(telegramId, phoneNumber, botId)
    t.ctx = { email, botId, botToken, telegramId, phoneNumber }

    await waitForReact()
    await LandingPage.selectLogin()
    await LoginPage.login(email)

    // Check to ensure we've logged in
    await t.expect(getPageUrl()).contains('/campaigns')
  })
  .afterEach(async () => {
    await MailClient.deleteAll()
    TelegramClient.deleteAll()
  })

test('Create Telegram campaign', async (t) => {
  const { phoneNumber, telegramId, botId, botToken } = t.ctx
  await CampaignsPage.selectCreateCampaign()
  await CreateModalPage.createCampaign('telegram', 'Telegram')

  await TelegramCampaignPage.createTemplate({
    body: 'This is a test message',
  })
  await TelegramCampaignPage.uploadRecipient({
    filename: './../files/telegram.csv',
  })
  await TelegramCampaignPage.enterAndValidateNewCredentials({
    botToken,
    phoneNumber,
  })
  const botInfo = TelegramClient.getBotInfo(botId)
  await t.expect(botInfo.webhookUrl).ok()
  await t.expect(botInfo.commands.length).eql(2)

  await TelegramCampaignPage.sendCampaign()
  await ProgressDetailsPage.checkStatistics({
    error: 1,
    sent: 3,
    invalid: 0,
  })

  const latestMessage = TelegramClient.getLastestMessage(telegramId)
  await t.expect(latestMessage.text).eql('This is a test message')
})
