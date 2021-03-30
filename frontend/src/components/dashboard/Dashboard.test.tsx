import userEvent from '@testing-library/user-event'
import React from 'react'
import {
  server,
  rest,
  render as _render,
  screen,
  fireEvent,
  waitFor,
} from '../../test-utils'
import Dashboard from './Dashboard'

const USER_CREDENTIALS = [{ label: 'test-twilio-cred', type: 'SMS' }]
const USER_EMAIL = 'testEmail@open.gov.sg'
const MESSAGE_TEXT = 'Test message'
const CSV_FILENAME = 'test_email_recipients.csv'
const PRESIGNED_URL =
  'https://s3.ap-southeast-1.amazonaws.com/file-test.postman.gov.sg/test_params'

const COMMON_API_ENDPOINTS = [
  rest.get('/auth/userinfo', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ email: USER_EMAIL, id: 1 }))
  }),
  rest.get('/settings', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        creds: USER_CREDENTIALS,
        demo: {
          num_demo_sms: 0,
          num_demos_telegram: 0,
          is_displayed: false,
        },
        has_api_key: true,
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
  rest.get('/campaign/:campaignId/stats', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        error: 0,
        sent: 1,
        unsent: 0,
        invalid: 0,
        updated_at: new Date(),
        status: 'LOGGED',
        halted: false,
        status_updated_at: new Date(),
      })
    )
  }),
  rest.post('/campaign/:campaignId/refresh-stats', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        error: 0,
        sent: 1,
        unsent: 0,
        invalid: 0,
        updated_at: new Date(),
        status: 'LOGGED',
        halted: false,
        status_updated_at: new Date(),
      })
    )
  }),
]

const renderDashboard = () =>
  _render(<Dashboard />, {
    router: { initialIndex: 0, initialEntries: ['/campaigns'] },
  })

test('creates and sends a new email campaign', async () => {
  const SUBJECT_TEXT = 'Test subject'
  const FROM = 'Postman Test <donotreply@test.postman.gov.sg>'
  const REPLY_TO = USER_EMAIL
  const RECIPIENT_EMAIL = 'testEmailRecipient@gmail.com'
  const CSV_FILE = new File([`recipient\n${RECIPIENT_EMAIL}`], CSV_FILENAME, {
    type: 'text/csv',
  })

  server.use(
    ...COMMON_API_ENDPOINTS,
    rest.get('/campaigns', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          campaigns: [
            {
              id: 1,
              name: 'Name of campaign 1',
              type: 'EMAIL',
              created_at: '2021-01-01T00:00:00.000Z',
              valid: false,
              has_credential: false,
              halted: false,
              protect: false,
              redacted: false,
              demo_message_limit: null,
              job_queue: [],
            },
          ],
          total_count: 1,
        })
      )
    }),
    rest.get('/campaign/:campaignId', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          id: campaignId,
          name: `Name of campaign ${campaignId}`,
          type: 'EMAIL',
          created_at: '2021-01-01T00:00:00.000Z',
          valid: true,
          protect: false,
          demo_message_limit: null,
          has_credential: false,
          csv_filename: null,
          is_csv_processing: false,
          num_recipients: null,
          redacted: false,
          job_queue: [],
          email_templates: null,
        })
      )
    }),
    rest.get('/settings/email/from', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          from: [FROM],
        })
      )
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
      return res(
        ctx.status(200),
        ctx.json({
          message: `Template for campaign ${campaignId} updated`,
          valid: false,
          num_recipients: 0,
          template: {
            body,
            subject,
            params: [],
            reply_to: replyTo ?? REPLY_TO,
            from,
          },
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
          presigned_url:
            'https://s3.ap-southeast-1.amazonaws.com/file-test.postman.gov.sg/test_params',
          transaction_id: 'test_transaction_id',
        })
      )
    }),
    rest.put(
      'https://s3.ap-southeast-1.amazonaws.com/file-test.postman.gov.sg/test_params',
      (_req, res, ctx) => {
        return res(ctx.status(200), ctx.set('ETag', 'test_etag_value'))
      }
    ),
    rest.post('/campaign/:campaignId/upload/complete', (req, res, ctx) => {
      const { transaction_id: transactionId, filename, etag } = req.body as {
        transaction_id?: string
        filename?: string
        etag?: string
      }
      if (!transactionId || !filename || !etag) {
        return res(ctx.status(400))
      }
      return res(ctx.status(202))
    }),
    rest.get('/campaign/:campaignId/upload/status', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          is_csv_processing: false,
          csv_filename: CSV_FILENAME,
          num_recipients: 1,
          preview: {
            body: MESSAGE_TEXT,
            subject: SUBJECT_TEXT,
            replyTo: REPLY_TO,
            from: FROM,
          },
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
    rest.get('/campaign/:campaignId/email/preview', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          preview: {
            body: MESSAGE_TEXT,
            subject: SUBJECT_TEXT,
            reply_to: REPLY_TO,
            from: FROM,
          },
        })
      )
    })
  )

  renderDashboard()

  // Wait for dashboard to load and ensure that the necessary elements are present
  const campaignRow = await screen.findByRole('row', {
    name: /name of campaign 1 jan 01 2021/i,
  })
  expect(campaignRow).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {
      name: /1 past campaigns/i,
    })
  ).toBeInTheDocument()

  // Click on the first campaign
  userEvent.click(campaignRow)

  // Wait for the message template to load
  expect(
    await screen.findByRole('heading', { name: /name of campaign 1/i })
  ).toBeInTheDocument()

  // Select the default from address
  const customFromDropdown = screen.getByRole('listbox', {
    name: /custom from/i,
  })
  userEvent.click(customFromDropdown)
  userEvent.click(
    await screen.findByRole('option', {
      name: FROM,
    })
  )
  expect(customFromDropdown).toHaveTextContent(FROM)

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
  userEvent.upload(fileUploadInput, CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(CSV_FILE)

  // Wait for CSV to be processed and ensure that message preview is shown
  expect(await screen.findByText(/message preview/i)).toBeInTheDocument()
  expect(screen.getByText(/1 recipient/i)).toBeInTheDocument()
  expect(screen.getByText(CSV_FILENAME)).toBeInTheDocument()
  expect(screen.getByText(FROM)).toBeInTheDocument()
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
  expect(await screen.findByText(FROM)).toBeInTheDocument()
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

test('creates and sends a new SMS campaign', async () => {
  const RECIPIENT_NUMBER = '89898989'
  const CSV_FILE = new File([`recipient\n${RECIPIENT_NUMBER}`], CSV_FILENAME, {
    type: 'text/csv',
  })

  server.use(
    ...COMMON_API_ENDPOINTS,
    rest.get('/campaigns', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          campaigns: [
            {
              created_at: '2021-01-01T00:00:00.000Z',
              demo_message_limit: null,
              halted: false,
              has_credential: false,
              id: 1,
              job_queue: [],
              name: 'Name of campaign 1',
              protect: false,
              redacted: false,
              type: 'SMS',
              valid: false,
            },
          ],
          total_count: 1,
        })
      )
    }),
    rest.get('/campaign/:campaignId', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          created_at: '2021-01-01T00:00:00.000Z',
          csv_filename: null,
          demo_message_limit: null,
          has_credential: false,
          id: campaignId,
          is_csv_processing: false,
          job_queue: [],
          name: `Name of campaign ${campaignId}`,
          num_recipients: null,
          protect: false,
          redacted: false,
          sms_templates: null, // diff
          type: 'SMS', // diff
          valid: true,
        })
      )
    }),
    rest.put('/campaign/:campaignId/sms/template', (req, res, ctx) => {
      const { campaignId } = req.params
      const { body } = req.body as { body: string }
      if (!body) {
        return res(ctx.status(400))
      }
      return res(
        ctx.status(200),
        ctx.json({
          message: `Template for campaign ${campaignId} updated`,
          num_recipients: 0,
          template: {
            body,
            params: [],
          },
          valid: true,
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
    rest.post('/campaign/:campaignId/upload/complete', (req, res, ctx) => {
      const { transaction_id: transactionId, filename, etag } = req.body as {
        transaction_id?: string
        filename?: string
        etag?: string
      }
      if (!transactionId || !filename || !etag) {
        return res(ctx.status(400))
      }
      return res(ctx.status(202))
    }),

    rest.get('/campaign/:campaignId/upload/status', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          csv_filename: CSV_FILENAME,
          is_csv_processing: false,
          num_recipients: 1,
          preview: {
            body: MESSAGE_TEXT,
          },
        })
      )
    }),
    rest.get('/settings/sms/credentials', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json(
          USER_CREDENTIALS.filter((cred) => cred.type === 'SMS').map(
            (cred) => cred.label
          )
        )
      )
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
        !USER_CREDENTIALS.some((cred) => cred.label === label)
      ) {
        return res(ctx.status(400))
      }
      return res(ctx.status(200))
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
    })
  )

  renderDashboard()

  // Wait for dashboard to load and ensure that the necessary elements are present
  const campaignRow = await screen.findByRole('row', {
    name: /name of campaign 1 jan 01 2021/i,
  })
  expect(campaignRow).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {
      name: /1 past campaigns/i,
    })
  ).toBeInTheDocument()

  // Click on the first campaign
  userEvent.click(campaignRow)

  // Wait for the message template to load
  expect(
    await screen.findByRole('heading', { name: /name of campaign 1/i })
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
  userEvent.upload(fileUploadInput, CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(CSV_FILE)

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
      name: /send rate optional/i,
    })
  )
  const sendRateTextbox = screen.getByRole('textbox', {
    name: /send rate limit/i,
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
