import userEvent from '@testing-library/user-event'
import {
  server,
  screen,
  fireEvent,
  waitFor,
  TELEGRAM_CREDENTIAL,
  DEFAULT_FROM,
  VALID_CSV_FILENAME,
} from 'test-utils'
import {
  mockApis,
  renderDashboard,
  CAMPAIGN_NAME,
  SUBJECT_TEXT,
  MESSAGE_TEXT,
  EMAIL_CSV_FILE,
  REPLY_TO,
  RECIPIENT_EMAIL,
  MOBILE_CSV_FILE,
  RECIPIENT_NUMBER,
  UNPROTECTED_MESSAGE_TEXT,
} from '../util'

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
  userEvent.upload(fileUploadInput, MOBILE_CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(MOBILE_CSV_FILE)

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

test('successfully creates and sends a new protected email campaign', async () => {
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

  // Click on the email channel button
  const emailChannelButton = screen.getByRole('button', {
    name: /^email$/i,
  })
  userEvent.click(emailChannelButton)
  userEvent.click(screen.getByText(/password protected/i))
  expect(emailChannelButton).toHaveClass('active')
  expect(screen.getByRole('button', { name: /^telegram$/i })).not.toHaveClass(
    'active'
  )
  expect(screen.getByRole('button', { name: /^sms/i })).not.toHaveClass(
    'active'
  )

  // Click on the "Create campaign" button
  userEvent.click(screen.getByRole('button', { name: /create campaign/i }))

  // Wait for the message template to load
  expect(
    await screen.findByRole('heading', { name: CAMPAIGN_NAME })
  ).toBeInTheDocument()

  // Select the default from address
  const customFromDropdown = screen.getByRole('listbox', {
    name: /custom from/i,
  })
  userEvent.click(customFromDropdown)
  userEvent.click(
    await screen.findByRole('option', {
      name: DEFAULT_FROM,
    })
  )
  expect(customFromDropdown).toHaveTextContent(DEFAULT_FROM)

  // Type in email subject
  const subjectTextbox = screen.getByRole('textbox', {
    name: /subject/i,
  })
  for (const char of SUBJECT_TEXT) {
    userEvent.type(subjectTextbox, char)
  }
  expect(subjectTextbox).toHaveTextContent(SUBJECT_TEXT)

  // Type in email message
  // Note: we need to paste the message in as the textbox is not a real textbox
  const messageTextbox = screen.getByRole('textbox', {
    name: /rdw-editor/i,
  })
  fireEvent.paste(messageTextbox, {
    clipboardData: {
      getData: () => UNPROTECTED_MESSAGE_TEXT,
    },
  })
  expect(messageTextbox).toHaveTextContent(UNPROTECTED_MESSAGE_TEXT)

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

  // Type in protected message
  const protectedMessageTextbox = screen.getByRole('textbox', {
    name: /message b/i,
  })
  userEvent.type(protectedMessageTextbox, MESSAGE_TEXT)
  expect(protectedMessageTextbox).toHaveValue(MESSAGE_TEXT)

  // Upload the file
  // Note: we cannot select files via the file picker
  const fileUploadInput = screen.getByLabelText(
    /upload file/i
  ) as HTMLInputElement
  userEvent.upload(fileUploadInput, EMAIL_CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(EMAIL_CSV_FILE)

  // Wait for CSV to be processed and ensure that protected message preview is shown
  expect(await screen.findByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(/results/i)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Click the confirm button
  userEvent.click(
    screen.getByRole('button', {
      name: /confirm/i,
    })
  )

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(DEFAULT_FROM)).toBeInTheDocument()
  expect(screen.getByText(VALID_CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(SUBJECT_TEXT)).toBeInTheDocument()
  expect(screen.getByText(UNPROTECTED_MESSAGE_TEXT)).toBeInTheDocument()
  expect(screen.getAllByText(REPLY_TO)).toHaveLength(2)

  // Go to the send test email page and wait for it to load
  userEvent.click(
    await screen.findByRole('button', {
      name: /next/i,
    })
  )
  expect(
    await screen.findByRole('heading', {
      name: /send a test email/i,
    })
  ).toBeInTheDocument()

  // Enter a test recipient email
  const testEmailTextbox = await screen.findByRole('textbox', {
    name: /preview/i,
  })
  // Somehow using userEvent.type results in the following error:
  // TypeError: win.getSelection is not a function
  fireEvent.change(testEmailTextbox, {
    target: {
      value: RECIPIENT_EMAIL,
    },
  })
  expect(testEmailTextbox).toHaveValue(RECIPIENT_EMAIL)

  // Send the test email and wait for validation
  userEvent.click(
    screen.getByRole('button', {
      name: /send/i,
    })
  )
  expect(
    await screen.findByText(/credentials have been validated/i)
  ).toBeInTheDocument()

  // Go to the preview and send page
  userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    })
  )

  // Wait for the page to load and ensure the necessary elements are shown
  expect(await screen.findByText(DEFAULT_FROM)).toBeInTheDocument()
  expect(screen.getByText(SUBJECT_TEXT)).toBeInTheDocument()
  expect(screen.getByText(UNPROTECTED_MESSAGE_TEXT)).toBeInTheDocument()
  expect(screen.getAllByText(REPLY_TO)).toHaveLength(2)

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

  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})
