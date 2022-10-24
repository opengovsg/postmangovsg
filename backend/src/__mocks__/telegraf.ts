const mockTelegram = {
  sendMessage: jest.fn(),
  setWebhook: jest.fn(),
  setMyCommands: jest.fn(),
  getMe: jest.fn(),
}

const Telegram = jest.fn(() => mockTelegram)

// For now, return actual Telegraf implementation if it's required
const Telegraf = jest.requireActual('telegraf')

export { mockTelegram, Telegram }
export default Telegraf
