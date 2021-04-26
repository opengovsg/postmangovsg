import userEvent from '@testing-library/user-event'
import {
  server,
  screen,
  waitFor,
  TELEGRAM_CREDENTIAL,
  VALID_CSV_FILENAME,
  VALID_MOBILE_CSV_FILE,
  RECIPIENT_NUMBER,
} from 'test-utils'
import { mockApis, renderDashboard, CAMPAIGN_NAME, MESSAGE_TEXT } from '../util'

test('successfully creates and sends a new Telegram campaign', async () => {
  // Setup
  jest.useFakeTimers()
  server.use(...mockApis())
  renderDashboard()

  // Wait for the Dashboard to load
  const newCampaignButton = await screen.findByRole('button', {
    name: /create new campaign/i,
  })

  // Click on the "Create new campaign" button
  userEvent.click(newCampaignButton)

  // Wait for the CreateModal to load
  const campaignNameTextbox = await screen.findByRole('textbox', {
    name: /name your campaign/i,
  })

  // Fill in the campaign title
  userEvent.type(campaignNameTextbox, CAMPAIGN_NAME)
  expect(campaignNameTextbox).toHaveValue(CAMPAIGN_NAME)

  // Click on the Telegram channel button
  const telegramChannelButton = screen.getByRole('button', {
    name: /^telegram$/i,
  })
  userEvent.click(telegramChannelButton)
  expect(telegramChannelButton).toHaveClass('active')
  expect(screen.getByRole('button', { name: /^sms/i })).not.toHaveClass(
    'active'
  )
  expect(screen.getByRole('button', { name: /^email$/i })).not.toHaveClass(
    'active'
  )

  // Click on the "Create campaign" button
  userEvent.click(screen.getByRole('button', { name: /create campaign/i }))

  // Wait for the message template to load
  expect(
    await screen.findByRole('heading', { name: CAMPAIGN_NAME })
  ).toBeInTheDocument()

  // Type in Telegram message
  const messageTextbox = screen.getByRole('textbox', {
    name: /message/i,
  })
  for (const char of MESSAGE_TEXT) {
    userEvent.type(messageTextbox, char)
  }
  expect(messageTextbox).toHaveTextContent(MESSAGE_TEXT)

  // Go to upload recipients page and wait for it to load
  userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    })
  )
  expect(
    await screen.findByRole('button', {
      name: /download a sample \.csv file/i,
    })
  ).toBeInTheDocument()

  // Upload the file
  // Note: we cannot select files via the file picker
  const fileUploadInput = screen.getByLabelText(
    /upload file/i
  ) as HTMLInputElement
  userEvent.upload(fileUploadInput, VALID_MOBILE_CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(VALID_MOBILE_CSV_FILE)

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(/message preview/i)).toBeInTheDocument()
  expect(screen.getByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(VALID_CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Go to the credential validation page and wait for it to load
  userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    })
  )
  expect(
    await screen.findByRole('heading', {
      name: /insert your telegram credentials/i,
    })
  ).toBeInTheDocument()

  // Select a Telegram credential
  const credentialDropdown = screen.getByRole('listbox', {
    name: /telegram credentials/i,
  })
  userEvent.click(credentialDropdown)
  userEvent.click(
    await screen.findByRole('option', {
      name: TELEGRAM_CREDENTIAL,
    })
  )
  expect(credentialDropdown).toHaveTextContent(TELEGRAM_CREDENTIAL)

  // Click on the "Validate credentials" button
  userEvent.click(
    screen.getByRole('button', {
      name: /validate credentials/i,
    })
  )
  expect(
    await screen.findByRole('heading', {
      name: /credentials have already been validated\./i,
    })
  )

  // Enter a test recipient number
  const testNumberTextbox = await screen.findByRole('textbox', {
    name: /preview/i,
  })
  userEvent.type(testNumberTextbox, RECIPIENT_NUMBER)
  expect(testNumberTextbox).toHaveValue(RECIPIENT_NUMBER)

  // Click on the "Send test message" button and wait for validation
  userEvent.click(
    screen.getByRole('button', {
      name: /send test message/i,
    })
  )
  expect(
    await screen.findByText(/message sent successfully\./i)
  ).toBeInTheDocument()

  // Go to the preview and send page
  userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    })
  )
  // Wait for the page to load and ensure the necessary elements are shown
  expect(await screen.findByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Enter a custom send rate
  userEvent.click(
    screen.getByRole('button', {
      name: /send rate/i,
    })
  )
  const sendRateTextbox = screen.getByRole('textbox', {
    name: /send rate/i,
  })
  userEvent.type(sendRateTextbox, '30')
  expect(sendRateTextbox).toHaveValue('30')

  // Click the send campaign button
  userEvent.click(
    screen.getByRole('button', {
      name: /send campaign now/i,
    })
  )

  // Wait for the confirmation modal to load
  expect(
    await screen.findByRole('heading', {
      name: /are you absolutely sure/i,
    })
  ).toBeInTheDocument()

  // Click on the confirm send now button
  userEvent.click(
    screen.getByRole('button', {
      name: /confirm send now/i,
    })
  )

  // Wait for the campaign to be sent and ensure
  // that the necessary elements are present
  expect(
    await screen.findByRole('row', {
      name: /status description message count/i,
    })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('row', {
      name: /sent date total messages status/i,
    })
  ).toBeInTheDocument()

  // Wait for the campaign to be fully sent
  expect(
    await screen.findByRole('button', {
      name: /the delivery report is being generated/i,
    })
  ).toBeInTheDocument()

  // Click the refresh stats button
  const refreshStatsButton = screen.getByRole('button', {
    name: /refresh stats/i,
  })

  userEvent.click(refreshStatsButton)
  expect(refreshStatsButton).toBeDisabled()
  await waitFor(() => expect(refreshStatsButton).toBeEnabled())

  // Cleanup
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})
