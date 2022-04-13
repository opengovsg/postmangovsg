import userEvent from '@testing-library/user-event'

import { mockApis, renderDashboard, CAMPAIGN_NAME, MESSAGE_TEXT } from '../util'

import {
  server,
  screen,
  waitFor,
  TWILIO_CREDENTIAL,
  VALID_CSV_FILENAME,
  RECIPIENT_NUMBER,
  VALID_MOBILE_CSV_FILE,
} from 'test-utils'

test('successfully creates and sends a new SMS campaign', async () => {
  // Setup
  jest.useFakeTimers()
  server.use(...mockApis())
  renderDashboard()

  // Wait for the Dashboard to load
  const newCampaignButton = await screen.findByRole('button', {
    name: /create new campaign/i,
  })

  // Click on the "Create new campaign" button
  await userEvent.click(newCampaignButton, { delay: null })

  // Wait for the CreateModal to load
  const campaignNameTextbox = await screen.findByRole('textbox', {
    name: /name your campaign/i,
  })

  // Fill in the campaign title
  await userEvent.type(campaignNameTextbox, CAMPAIGN_NAME, { delay: null })
  expect(campaignNameTextbox).toHaveValue(CAMPAIGN_NAME)

  // Click on the SMS channel button
  const smsChannelButton = screen.getByRole('button', {
    name: /^sms$/i,
  })
  await userEvent.click(smsChannelButton, { delay: null })
  expect(smsChannelButton).toHaveClass('active')
  expect(screen.getByRole('button', { name: /^telegram$/i })).not.toHaveClass(
    'active'
  )
  expect(screen.getByRole('button', { name: /^email$/i })).not.toHaveClass(
    'active'
  )

  // Click on the "Create campaign" button
  await userEvent.click(
    screen.getByRole('button', { name: /create campaign/i }),
    { delay: null }
  )

  // Wait for the message template to load
  expect(
    await screen.findByRole('heading', { name: CAMPAIGN_NAME })
  ).toBeInTheDocument()

  // Type in SMS message
  const messageTextbox = screen.getByRole('textbox', {
    name: /message/i,
  })
  for (const char of MESSAGE_TEXT) {
    await userEvent.type(messageTextbox, char, { delay: null })
  }
  expect(messageTextbox).toHaveTextContent(MESSAGE_TEXT)

  // Go to upload recipients page and wait for it to load
  await userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    }),
    { delay: null }
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
  await userEvent.upload(fileUploadInput, VALID_MOBILE_CSV_FILE, {
    delay: null,
  })
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(VALID_MOBILE_CSV_FILE)

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(/message preview/i)).toBeInTheDocument()
  expect(screen.getByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(VALID_CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Go to the credential validation page and wait for it to load
  await userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    }),
    { delay: null }
  )
  expect(
    await screen.findByRole('heading', {
      name: /select your twilio credentials/i,
    })
  ).toBeInTheDocument()

  // Select an SMS credential
  const credentialDropdown = screen.getByRole('listbox', {
    name: /twilio credentials/i,
  })
  await userEvent.click(credentialDropdown, { delay: null })
  await userEvent.click(
    await screen.findByRole('option', {
      name: TWILIO_CREDENTIAL,
    }),
    { delay: null }
  )
  expect(credentialDropdown).toHaveTextContent(TWILIO_CREDENTIAL)

  // Enter a test recipient number
  const testNumberTextbox = await screen.findByRole('textbox', {
    name: /preview/i,
  })
  await userEvent.type(testNumberTextbox, RECIPIENT_NUMBER, { delay: null })
  expect(testNumberTextbox).toHaveValue(RECIPIENT_NUMBER)

  // Send the test SMS and wait for validation
  await userEvent.click(
    screen.getByRole('button', {
      name: /send/i,
    }),
    { delay: null }
  )
  expect(
    await screen.findByText(/credentials have already been validated/i)
  ).toBeInTheDocument()

  // Go to the preview and send page
  await userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    }),
    { delay: null }
  )
  // Wait for the page to load and ensure the necessary elements are shown
  expect(await screen.findByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Enter a custom send rate
  await userEvent.click(
    screen.getByRole('button', {
      name: /send rate/i,
    }),
    { delay: null }
  )
  const sendRateTextbox = screen.getByRole('textbox', {
    name: /send rate/i,
  })
  await userEvent.type(sendRateTextbox, '10', { delay: null })
  expect(sendRateTextbox).toHaveValue('10')

  // Click the send campaign button
  await userEvent.click(
    screen.getByRole('button', {
      name: /send campaign now/i,
    }),
    { delay: null }
  )

  // Wait for the confirmation modal to load
  expect(
    await screen.findByRole('heading', {
      name: /are you absolutely sure/i,
    })
  ).toBeInTheDocument()

  // Click on the confirm send now button
  await userEvent.click(
    screen.getByRole('button', {
      name: /confirm send now/i,
    }),
    { delay: null }
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

  await userEvent.click(refreshStatsButton, { delay: null })
  expect(refreshStatsButton).toBeDisabled()
  await waitFor(() => expect(refreshStatsButton).toBeEnabled())

  // Cleanup
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})
