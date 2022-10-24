import userEvent from '@testing-library/user-event'
import {
  DEFAULT_FROM,
  DEFAULT_FROM_ADDRESS,
  fireEvent,
  RECIPIENT_EMAIL,
  screen,
  server,
  VALID_CSV_FILENAME,
  VALID_EMAIL_CSV_FILE,
} from 'test-utils'

import {
  CAMPAIGN_NAME,
  MESSAGE_TEXT,
  mockApis,
  renderDashboard,
  REPLY_TO,
  SUBJECT_TEXT,
  UNPROTECTED_MESSAGE_TEXT,
} from '../util'

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
  await userEvent.click(newCampaignButton, { delay: null })

  // Wait for the CreateModal to load
  const campaignNameTextbox = await screen.findByRole('textbox', {
    name: /name your campaign/i,
  })

  // Fill in the campaign title
  await userEvent.type(campaignNameTextbox, CAMPAIGN_NAME, { delay: null })
  expect(campaignNameTextbox).toHaveValue(CAMPAIGN_NAME)

  // Click on the email channel button
  const emailChannelButton = screen.getByRole('button', {
    name: /^email$/i,
  })
  await userEvent.click(emailChannelButton, { delay: null })
  await userEvent.click(screen.getByText(/password protected/i), {
    delay: null,
  })
  expect(emailChannelButton).toHaveClass('active')
  expect(screen.getByRole('button', { name: /^telegram$/i })).not.toHaveClass(
    'active'
  )
  expect(screen.getByRole('button', { name: /^sms/i })).not.toHaveClass(
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

  // Select the default from address
  const customFromDropdown = screen.getByRole('listbox', {
    name: /custom from/i,
  })
  await userEvent.click(customFromDropdown, { delay: null })
  await userEvent.click(
    await screen.findByRole('option', {
      name: DEFAULT_FROM_ADDRESS,
    }),
    { delay: null }
  )
  expect(customFromDropdown).toHaveTextContent(DEFAULT_FROM_ADDRESS)

  // Type in email subject
  const subjectTextbox = screen.getByRole('textbox', {
    name: /subject/i,
  })
  for (const char of SUBJECT_TEXT) {
    await userEvent.type(subjectTextbox, char, { delay: null })
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

  // Type in protected message
  const protectedMessageTextbox = screen.getByRole('textbox', {
    name: /rdw-editor/i,
  })
  fireEvent.paste(protectedMessageTextbox, {
    clipboardData: {
      getData: () => MESSAGE_TEXT,
    },
  })
  expect(protectedMessageTextbox).toHaveTextContent(MESSAGE_TEXT)

  // Upload the file
  // Note: we cannot select files via the file picker
  const fileUploadInput = screen.getByLabelText(
    /upload file/i
  ) as HTMLInputElement
  await userEvent.upload(fileUploadInput, VALID_EMAIL_CSV_FILE, { delay: null })
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(VALID_EMAIL_CSV_FILE)

  // Wait for CSV to be processed and ensure that protected message preview is shown
  expect(await screen.findByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Click the confirm button
  await userEvent.click(
    screen.getByRole('button', {
      name: /confirm/i,
    }),
    { delay: null }
  )

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(DEFAULT_FROM)).toBeInTheDocument()
  expect(screen.getByText(VALID_CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(SUBJECT_TEXT)).toBeInTheDocument()
  expect(screen.getByText(UNPROTECTED_MESSAGE_TEXT)).toBeInTheDocument()
  expect(screen.getAllByText(REPLY_TO)).toHaveLength(2)

  // Go to the send test email page and wait for it to load
  await userEvent.click(
    await screen.findByRole('button', {
      name: /next/i,
    }),
    { delay: null }
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
  await userEvent.click(
    screen.getByRole('button', {
      name: /send/i,
    }),
    { delay: null }
  )
  expect(
    await screen.findByText(/credentials have been validated/i)
  ).toBeInTheDocument()

  // Go to the preview and send page
  await userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    }),
    { delay: null }
  )

  // Wait for the page to load and ensure the necessary elements are shown
  expect(await screen.findByText(DEFAULT_FROM)).toBeInTheDocument()
  expect(screen.getByText(SUBJECT_TEXT)).toBeInTheDocument()
  expect(screen.getByText(UNPROTECTED_MESSAGE_TEXT)).toBeInTheDocument()
  expect(screen.getAllByText(REPLY_TO)).toHaveLength(2)

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

  // Teardown
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})
