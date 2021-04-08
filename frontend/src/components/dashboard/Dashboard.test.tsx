import userEvent from '@testing-library/user-event'
import React from 'react'
import {
  server,
  rest,
  render as _render,
  screen,
  fireEvent,
  waitFor,
  mockCommonApis,
  TWILIO_CREDENTIAL,
  TELEGRAM_CREDENTIAL,
} from '../../test-utils'
import Dashboard from './Dashboard'

const REPLY_TO = 'testEmail@open.gov.sg'
const MESSAGE_TEXT = 'Test message'
const UNPROTECTED_MESSAGE_TEXT = 'Test message {{protectedlink}}'
const CSV_FILENAME = 'test_email_recipients.csv'
const PRESIGNED_URL =
  'https://s3.ap-southeast-1.amazonaws.com/file-test.postman.gov.sg/test_params'
const DEFAULT_FROM = 'Postman Test <donotreply@test.postman.gov.sg>'
const CAMPAIGN_NAME = 'Test campaign name'
const SUBJECT_TEXT = 'Test subject'
const RECIPIENT_EMAIL = 'testEmailRecipient@gmail.com'
const RECIPIENT_NUMBER = '89898989'
const PROTECTED_PASSWORD = 'test password'
const EMAIL_CSV_FILE = new File(
  [`recipient,password\n${RECIPIENT_EMAIL},${PROTECTED_PASSWORD}`],
  CSV_FILENAME,
  {
    type: 'text/csv',
  }
)
const MOBILE_CSV_FILE = new File(
  [`recipient\n${RECIPIENT_NUMBER}`],
  CSV_FILENAME,
  {
    type: 'text/csv',
  }
)

interface Template {
  body: string
  subject?: string
  from?: string
  params: string
  reply_to?: string
}

interface Campaign {
  created_at: Date
  demo_message_limit: number | null
  halted: boolean
  id: number
  name: string
  protect: boolean
  type: string
  valid: boolean

  csv_filename: string | null
  is_csv_processing: boolean
  job_queue: any[]
  num_recipients: number | null
  template?: Template
}

function extractParamsFromBody(body: string) {
  const params = []
  const matches = body.matchAll(/{{.+?}}/g)
  for (
    let curMatch = matches.next();
    !curMatch.done;
    curMatch = matches.next()
  ) {
    params.push(curMatch.value[0].substring(1, curMatch.value[0].length - 1))
  }
  return `{${params.join(',')}}`
}

const mockApis = () => {
  const { state, handlers } = mockCommonApis({
    curUserId: 1, // Start out authenticated; 1-indexed
  })
  const campaigns: Campaign[] = []

  return [
    ...handlers,
    rest.get('/settings', (_req, res, ctx) => {
      const { creds, demo, api_key } = state.users[state.curUserId - 1]
      return res(
        ctx.status(200),
        ctx.json({
          creds,
          demo,
          has_api_key: !!api_key,
        })
      )
    }),
    rest.get('/settings/email/from', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          from: [DEFAULT_FROM],
        })
      )
    }),
    rest.get('/settings/sms/credentials', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json(
          state.users[state.curUserId - 1].creds
            .filter((cred) => cred.type === 'SMS')
            .map((cred) => cred.label)
        )
      )
    }),
    rest.get('/settings/telegram/credentials', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json(
          state.users[state.curUserId - 1].creds
            .filter((cred) => cred.type === 'TELEGRAM')
            .map((cred) => cred.label)
        )
      )
    }),
    rest.get('/campaigns', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          campaigns,
          total_count: campaigns.length,
        })
      )
    }),
    rest.post('/campaigns', (req, res, ctx) => {
      const { name, protect, type } = req.body as {
        name?: string
        protect?: boolean
        type?: string
      }
      if (!name || protect === undefined || !type) {
        return res(ctx.status(400))
      }
      const campaign = {
        created_at: new Date(),
        demo_message_limit: null,
        halted: false,
        id: campaigns.length + 1,
        name,
        protect,
        type,
        valid: false,

        csv_filename: null,
        is_csv_processing: false,
        job_queue: [],
        num_recipients: 0,
      }
      campaigns.push(campaign)
      const { created_at, demo_message_limit, id } = campaign
      return res(
        ctx.status(201),
        ctx.json({
          created_at,
          demo_message_limit,
          id,
          name,
          protect,
          type,
        })
      )
    }),
    rest.get('/campaign/:campaignId', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(ctx.status(200), ctx.json(campaigns[campaignId - 1]))
    }),
    rest.put('/campaign/:campaignId/email/template', (req, res, ctx) => {
      const { campaignId } = req.params
      const { body, from, reply_to: replyTo, subject } = req.body as {
        body: string
        from: string
        reply_to: string
        subject: string
      }
      if (!body || !from || replyTo === undefined || !subject) {
        return res(ctx.status(400))
      }

      if (
        campaigns[campaignId - 1].protect &&
        !body.includes('{{protectedlink}}')
      ) {
        return res(ctx.status(500))
      }

      const template = {
        body,
        from,
        params: extractParamsFromBody(body),
        reply_to: replyTo ?? state.users[state.curUserId - 1].email,
        subject,
      }
      campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = campaigns[campaignId - 1]

      return res(
        ctx.status(200),
        ctx.json({
          message: `Template for campaign ${campaignId} updated`,
          valid,
          num_recipients,
          template,
        })
      )
    }),
    rest.put('/campaign/:campaignId/sms/template', (req, res, ctx) => {
      const { campaignId } = req.params
      const { body } = req.body as { body: string }
      if (!body) {
        return res(ctx.status(400))
      }

      const template = {
        body,
        params: extractParamsFromBody(body),
      }
      campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = campaigns[campaignId - 1]

      return res(
        ctx.status(200),
        ctx.json({
          message: `Template for campaign ${campaignId} updated`,
          num_recipients,
          template,
          valid,
        })
      )
    }),
    rest.put('/campaign/:campaignId/telegram/template', (req, res, ctx) => {
      const { campaignId } = req.params
      const { body } = req.body as { body: string }
      if (!body) {
        return res(ctx.status(400))
      }

      const template = {
        body,
        params: extractParamsFromBody(body),
      }
      campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = campaigns[campaignId - 1]

      return res(
        ctx.status(200),
        ctx.json({
          message: `Template for campaign ${campaignId} updated`,
          num_recipients,
          template,
          valid,
        })
      )
    }),
    rest.get('/campaign/:campaignId/stats', (req, res, ctx) => {
      const { campaignId } = req.params
      const { halted } = campaigns[campaignId - 1]

      return res(
        ctx.status(200),
        ctx.json({
          error: 0,
          sent: 1,
          unsent: 0,
          invalid: 0,
          updated_at: new Date(),
          status: 'LOGGED',
          halted,
          status_updated_at: new Date(),
        })
      )
    }),
    rest.post('/campaign/:campaignId/refresh-stats', (req, res, ctx) => {
      const { campaignId } = req.params
      const { halted } = campaigns[campaignId - 1]

      return res(
        ctx.status(200),
        ctx.json({
          error: 0,
          sent: 1,
          unsent: 0,
          invalid: 0,
          updated_at: new Date(),
          status: 'LOGGED',
          halted,
          status_updated_at: new Date(),
        })
      )
    }),
    rest.post('/campaign/:campaignId/email/credentials', (req, res, ctx) => {
      const { recipient } = req.body as { recipient?: string }
      if (!recipient) {
        return res(ctx.status(400))
      }
      return res(ctx.status(200))
    }),
    rest.post('/campaign/:campaignId/sms/credentials', (req, res, ctx) => {
      const { recipient, label } = req.body as {
        recipient?: string
        label?: string
      }
      if (
        !recipient ||
        !label ||
        // Check that the user actually has the credential
        !state.users[state.curUserId - 1].creds.some(
          (cred) => cred.label === label && cred.type === 'SMS'
        )
      ) {
        return res(ctx.status(400))
      }
      return res(ctx.status(200))
    }),
    rest.post('/campaign/:campaignId/telegram/credentials', (req, res, ctx) => {
      const { label } = req.body as {
        label?: string
      }
      if (
        !label ||
        // Check that the user actually has the credential
        !state.users[state.curUserId - 1].creds.some(
          (cred) => cred.label === label && cred.type === 'TELEGRAM'
        )
      ) {
        return res(ctx.status(400))
      }
      return res(ctx.status(200))
    }),
    rest.post(
      '/campaign/:campaignId/telegram/credentials/verify',
      (req, res, ctx) => {
        const { recipient } = req.body as { recipient?: string }
        if (!recipient) {
          return res(ctx.status(400))
        }
        return res(ctx.status(200))
      }
    ),
    rest.get('/campaign/:campaignId/email/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          preview: campaigns[campaignId - 1].template,
        })
      )
    }),
    rest.get('/campaign/:campaignId/sms/preview', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          preview: {
            body: MESSAGE_TEXT,
          },
        })
      )
    }),
    rest.get('/campaign/:campaignId/telegram/preview', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          preview: {
            body: MESSAGE_TEXT,
          },
        })
      )
    }),
    rest.get('/campaign/:campaignId/protect/upload/start', (req, res, ctx) => {
      const mimeType = req.url.searchParams.get('mime_type')
      const partCount = req.url.searchParams.get('part_count')
      if (!mimeType || !partCount) {
        return res(ctx.status(400))
      }
      return res(
        ctx.status(200),
        ctx.json({
          presigned_urls: [PRESIGNED_URL],
          transaction_id: 'test_transaction_id',
        })
      )
    }),
    rest.get('/campaign/:campaignId/upload/start', (req, res, ctx) => {
      const mimeType = req.url.searchParams.get('mime_type')
      const md5 = req.url.searchParams.get('md5')
      if (!mimeType || !md5) {
        return res(ctx.status(400))
      }
      return res(
        ctx.status(200),
        ctx.json({
          presigned_url: PRESIGNED_URL,
          transaction_id: 'test_transaction_id',
        })
      )
    }),
    rest.put(PRESIGNED_URL, (_req, res, ctx) => {
      return res(ctx.status(200), ctx.set('ETag', 'test_etag_value'))
    }),
    rest.post(
      '/campaign/:campaignId/protect/upload/complete',
      (req, res, ctx) => {
        const { campaignId } = req.params
        const {
          transaction_id: transactionId,
          filename,
          etags,
          part_count: partCount,
        } = req.body as {
          etags?: string[]
          filename?: string
          part_count: number
          transaction_id?: string
        }
        if (!transactionId || !filename || !etags || !partCount) {
          return res(ctx.status(400))
        }
        campaigns[campaignId - 1] = {
          ...campaigns[campaignId - 1],
          valid: true,
          num_recipients: 1,
          csv_filename: CSV_FILENAME,
        }
        return res(ctx.status(202))
      }
    ),
    rest.post('/campaign/:campaignId/upload/complete', (req, res, ctx) => {
      const { campaignId } = req.params
      const { transaction_id: transactionId, filename, etag } = req.body as {
        transaction_id?: string
        filename?: string
        etag?: string
      }
      if (!transactionId || !filename || !etag) {
        return res(ctx.status(400))
      }
      campaigns[campaignId - 1] = {
        ...campaigns[campaignId - 1],
        valid: true,
        num_recipients: 1,
        csv_filename: CSV_FILENAME,
      }
      return res(ctx.status(202))
    }),
    rest.get('/campaign/:campaignId/upload/status', (req, res, ctx) => {
      const { campaignId } = req.params
      if (!campaigns[campaignId - 1].template) {
        return res(ctx.status(400))
      }

      const { body, subject, reply_to: replyTo, from } = campaigns[
        campaignId - 1
      ].template as Template
      const { num_recipients, is_csv_processing, csv_filename } = campaigns[
        campaignId - 1
      ]

      return res(
        ctx.status(200),
        ctx.json({
          is_csv_processing,
          csv_filename,
          num_recipients,
          preview: {
            body,
            subject,
            replyTo,
            from,
          },
        })
      )
    }),
    rest.delete('/campaign/:campaignId/upload/status', (_req, res, ctx) => {
      return res(ctx.status(200))
    }),
    rest.post('/campaign/:campaignId/send', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({ campaign_id: campaignId, job_id: [1] })
      )
    }),
  ]
}

const renderDashboard = () =>
  _render(<Dashboard />, {
    router: { initialIndex: 0, initialEntries: ['/campaigns'] },
  })

test('successfully creates and sends a new email campaign', async () => {
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
      getData: () => MESSAGE_TEXT,
    },
  })
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
  userEvent.upload(fileUploadInput, EMAIL_CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(EMAIL_CSV_FILE)

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(/message preview/i)).toBeInTheDocument()
  expect(screen.getByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(DEFAULT_FROM)).toBeInTheDocument()
  expect(screen.getByText(SUBJECT_TEXT)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()
  expect(screen.getAllByText(REPLY_TO)).toHaveLength(2)

  // Go to the send test email page and wait for it to load
  userEvent.click(
    screen.getByRole('button', {
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
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()
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
})

test('successfully creates and sends a new SMS campaign', async () => {
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

  // Click on the SMS channel button
  const smsChannelButton = screen.getByRole('button', {
    name: /^sms$/i,
  })
  userEvent.click(smsChannelButton)
  expect(smsChannelButton).toHaveClass('active')
  expect(screen.getByRole('button', { name: /^telegram$/i })).not.toHaveClass(
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

  // Type in SMS message
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
  expect(screen.getByText(CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(MESSAGE_TEXT)).toBeInTheDocument()

  // Go to the credential validation page and wait for it to load
  userEvent.click(
    screen.getByRole('button', {
      name: /next/i,
    })
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
  userEvent.click(credentialDropdown)
  userEvent.click(
    await screen.findByRole('option', {
      name: TWILIO_CREDENTIAL,
    })
  )
  expect(credentialDropdown).toHaveTextContent(TWILIO_CREDENTIAL)

  // Enter a test recipient number
  const testNumberTextbox = await screen.findByRole('textbox', {
    name: /preview/i,
  })
  userEvent.type(testNumberTextbox, RECIPIENT_NUMBER)
  expect(testNumberTextbox).toHaveValue(RECIPIENT_NUMBER)

  // Send the test SMS and wait for validation
  userEvent.click(
    screen.getByRole('button', {
      name: /send/i,
    })
  )
  expect(
    await screen.findByText(/credentials have already been validated/i)
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
  userEvent.type(sendRateTextbox, '10')
  expect(sendRateTextbox).toHaveValue('10')

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
})

test('successfully creates and sends a new Telegram campaign', async () => {
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
  expect(screen.getByText(CSV_FILENAME)).toBeInTheDocument()
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
})

test('successfully creates and sends a new protected email campaign', async () => {
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
  expect(screen.getByText(CSV_FILENAME)).toBeInTheDocument()
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
