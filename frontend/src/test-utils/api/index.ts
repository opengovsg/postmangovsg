import {
  TemplateClient,
  XSS_EMAIL_OPTION,
  XSS_SMS_OPTION,
  XSS_TELEGRAM_OPTION,
} from '@shared/templating'

import { difference, union } from 'lodash'
import { rest } from 'msw'

import {
  DEFAULT_FROM,
  INVALID_CSV_FILENAME,
  INVALID_TELEGRAM_CREDENTIAL,
  INVALID_TWILIO_CREDENTIAL,
  PRESIGNED_URL,
  TELEGRAM_CREDENTIAL,
  TWILIO_CREDENTIAL,
  USER_EMAIL,
} from './constants'

import type {
  EmailTemplate,
  SMSTemplate,
  State,
  TelegramTemplate,
} from './interfaces'

import { ChannelType } from 'classes'

const smsTemplateClient = new TemplateClient({ xssOptions: XSS_SMS_OPTION })
const emailTemplateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
const telegramTemplateClient = new TemplateClient({
  xssOptions: XSS_TELEGRAM_OPTION,
  lineBreak: '\n',
})

function mockCommonApis(initialState?: Partial<State>) {
  const state: State = {
    // Stats
    totalMessagesSent: 0,

    // Auth
    users: [
      {
        api_key: 'test-api-key',
        creds: [
          { label: TWILIO_CREDENTIAL, type: 'SMS', valid: true },
          { label: TELEGRAM_CREDENTIAL, type: 'TELEGRAM', valid: true },
          { label: INVALID_TWILIO_CREDENTIAL, type: 'SMS', valid: false },
          {
            label: INVALID_TELEGRAM_CREDENTIAL,
            type: 'TELEGRAM',
            valid: false,
          },
        ],
        demo: {
          num_demo_sms: 0,
          num_demo_telegram: 0,
          is_displayed: false,
        },
        email: USER_EMAIL,
        id: 1,
      },
    ],
    curUserId: 0, // Start unauthenticated; 1-indexed

    // Campaigns
    campaigns: [], // Start with zero campaigns

    // Protected messages
    protectedMessages: [], // Start with zero protected messages

    // Lists
    lists: [], // Start with no managed lists

    ...initialState, // Allow tests to override the initial state
  }

  return {
    state,
    handlers: [
      ...mockStatsApis(state),
      ...mockAuthApis(state),
      ...mockSettingsApis(state),
      ...mockBaseCampaignApis(state),
      ...mockCampaignTemplateApis(state),
      ...mockCampaignCredentialApis(state),
      ...mockCampaignUploadApis(state),
      ...mockUnsubscribeApis(state),
      ...mockProtectApis(state),
      ...mockPhonebookApis(state),
    ],
  }
}

function mockStatsApis(state: State) {
  return [
    rest.get('/stats', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ sent: state.totalMessagesSent }))
    }),
  ]
}

function mockAuthApis(state: State) {
  return [
    rest.get('/auth/userinfo', (_req, res, ctx) => {
      if (!state.curUserId) {
        return res(ctx.status(200), ctx.json({}))
      }
      const { email, id } = state.users[state.curUserId - 1]
      return res(ctx.status(200), ctx.json({ email, id }))
    }),
  ]
}

function mockSettingsApis(state: State) {
  return [
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
    rest.put('/settings/announcement-version', (req, res, ctx) => {
      const { announcement_version } = req.body as {
        announcement_version?: string
      }
      if (!announcement_version) {
        return res(ctx.status(400))
      }
      return res(ctx.status(200))
    }),
    rest.get('/settings/email/from', (_req, res, ctx) => {
      const froms = state.customFroms || []
      return res(
        ctx.status(200),
        ctx.json({
          from: froms.concat([DEFAULT_FROM]),
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
  ]
}

function mockBaseCampaignApis(state: State) {
  return [
    rest.get('/campaigns', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          campaigns: state.campaigns,
          total_count: state.campaigns.length,
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
        id: state.campaigns.length + 1,
        name,
        protect,
        type,
        valid: false,
        has_credential: false,

        csv_filename: null,
        is_csv_processing: false,
        job_queue: [],
        num_recipients: 0,
      }
      state.campaigns.push(campaign)
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
      return res(ctx.status(200), ctx.json(state.campaigns[+campaignId - 1]))
    }),
    rest.post('/campaign/:campaignId/send', (req, res, ctx) => {
      const { campaignId } = req.params
      state.campaigns[+campaignId - 1].job_queue = [
        { status: 'LOGGED', sent_at: new Date().toISOString() },
      ]
      return res(
        ctx.status(200),
        ctx.json({ campaign_id: campaignId, job_id: [1] })
      )
    }),
    rest.get('/campaign/:campaignId/stats', (req, res, ctx) => {
      const { campaignId } = req.params
      const { halted } = state.campaigns[+campaignId - 1]

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
      const { halted } = state.campaigns[+campaignId - 1]

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
  ]
}

function mockCampaignTemplateApis(state: State) {
  function extractAndMergeParams(...texts: string[]) {
    const parsed = texts.map(
      (text) => emailTemplateClient.parseTemplate(text).variables
    )
    return union(...parsed)
  }
  function checkTemplateVariables(
    template: string,
    required: string[],
    optional: string[]
  ) {
    const present = extractAndMergeParams(template)

    const missing = difference(required, present)
    if (missing.length > 0) {
      throw new Error(
        `Error: There are missing keywords in the message template: ${missing}. Please return to the previous step to add in the keywords.`
      )
    }

    const whitelist = [...required, ...optional]
    const forbidden = difference(present, whitelist)
    if (forbidden.length > 0) {
      throw new Error(
        `Error: Only these keywords are allowed in the template: ${whitelist}.\nRemove the other keywords from the template: ${forbidden}.`
      )
    }
  }

  return [
    rest.put('/campaign/:campaignId/email/template', (req, res, ctx) => {
      const { campaignId } = req.params
      const {
        body,
        from,
        reply_to: replyTo,
        subject,
      } = req.body as {
        body: string
        from: string
        reply_to: string
        subject: string
      }

      const sanitizedSubject =
        emailTemplateClient.replaceNewLinesAndSanitize(subject)
      const sanitizedBody = emailTemplateClient.filterXSS(body)
      if (!sanitizedBody || !sanitizedSubject) {
        return res(
          ctx.status(400),
          ctx.json({
            message:
              'Message template is invalid as it only contains invalid HTML tags!',
          })
        )
      }

      if (!from || replyTo === undefined) {
        return res(ctx.status(400))
      }

      if (state.campaigns[+campaignId - 1].protect) {
        try {
          checkTemplateVariables(
            sanitizedSubject,
            [],
            ['protectedlink', 'recipient']
          )
          checkTemplateVariables(
            sanitizedBody,
            ['protectedlink'],
            ['recipient']
          )
        } catch (err) {
          return res(
            ctx.status(500),
            ctx.json({ message: (err as Error).message })
          )
        }
      }

      const template: EmailTemplate = {
        body: sanitizedBody,
        from,
        params: extractAndMergeParams(body, subject),
        reply_to: replyTo ?? state.users[state.curUserId - 1].email,
        subject: sanitizedSubject,
      }
      state.campaigns[+campaignId - 1].email_templates = template

      const { valid, num_recipients } = state.campaigns[+campaignId - 1]

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

      const sanitizedBody = smsTemplateClient.replaceNewLinesAndSanitize(body)
      if (!sanitizedBody) {
        return res(
          ctx.status(400),
          ctx.json({
            message:
              'Message template is invalid as it only contains invalid HTML tags!',
          })
        )
      }

      const template: SMSTemplate = {
        body: sanitizedBody,
        params: extractAndMergeParams(body),
      }
      state.campaigns[+campaignId - 1].sms_templates = template

      const { valid, num_recipients } = state.campaigns[+campaignId - 1]

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

      const sanitizedBody =
        telegramTemplateClient.replaceNewLinesAndSanitize(body)
      if (!sanitizedBody) {
        return res(
          ctx.status(400),
          ctx.json({
            message:
              'Message template is invalid as it only contians invalid HTML tags!',
          })
        )
      }

      const template: TelegramTemplate = {
        body: sanitizedBody,
        params: extractAndMergeParams(body),
      }
      state.campaigns[+campaignId - 1].telegram_templates = template

      const { valid, num_recipients } = state.campaigns[+campaignId - 1]

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
    rest.get('/campaign/:campaignId/email/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      const preview = state.campaigns[+campaignId - 1].email_templates
      return res(
        ctx.status(200),
        ctx.json({
          preview: {
            ...preview,
            // Frontend doesn't have access to the actual email theme, so return
            // body as themed_body for it to render for frontend tests
            themed_body: preview?.body,
          },
        })
      )
    }),
    rest.get('/campaign/:campaignId/sms/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          preview: state.campaigns[+campaignId - 1].sms_templates,
        })
      )
    }),
    rest.get('/campaign/:campaignId/telegram/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          preview: state.campaigns[+campaignId - 1].telegram_templates,
        })
      )
    }),
  ]
}

function mockCampaignCredentialApis(state: State) {
  return [
    rest.post('/campaign/:campaignId/email/credentials', (req, res, ctx) => {
      const { campaignId } = req.params
      const { recipient } = req.body as { recipient?: string }
      if (!recipient) {
        return res(ctx.status(400))
      }
      state.campaigns[+campaignId - 1].has_credential = true
      return res(ctx.status(200))
    }),
    rest.post('/campaign/:campaignId/sms/credentials', (req, res, ctx) => {
      const { campaignId } = req.params
      const { recipient, label } = req.body as {
        recipient?: string
        label?: string
      }
      if (
        !recipient ||
        !label ||
        // Check that the user actually has the credential
        !state.users[state.curUserId - 1].creds.some(
          // Use `valid` as a indicator for a valid credential
          (cred) => cred.label === label && cred.type === 'SMS' && cred.valid
        )
      ) {
        return res(ctx.status(400))
      }
      state.campaigns[+campaignId - 1].has_credential = true
      return res(ctx.status(200))
    }),
    rest.post('/campaign/:campaignId/telegram/credentials', (req, res, ctx) => {
      const { campaignId } = req.params
      const { label } = req.body as {
        label?: string
      }
      if (
        !label ||
        // Check that the user actually has the credential
        !state.users[state.curUserId - 1].creds.some(
          (cred) =>
            cred.label === label && cred.type === 'TELEGRAM' && cred.valid
        )
      ) {
        return res(ctx.status(400))
      }
      state.campaigns[+campaignId - 1].has_credential = true
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
  ]
}

function mockCampaignUploadApis(state: State) {
  return [
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
    rest.put(PRESIGNED_URL, (req, res, ctx) => {
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

        // Use the filename to determine if the CSV file is invalid
        // since jsdom doesn't store the file data on uploads
        if (filename === INVALID_CSV_FILENAME) {
          state.campaigns[+campaignId - 1] = {
            ...state.campaigns[+campaignId - 1],
            csv_error: 'Error: invalid recipient file',
            temp_csv_filename: filename,
          }
        } else {
          state.campaigns[+campaignId - 1] = {
            ...state.campaigns[+campaignId - 1],
            valid: true,
            num_recipients: 1,
            csv_filename: filename,
            is_csv_processing: false,
            temp_csv_filename: undefined,
            csv_error: undefined,
          }
        }

        return res(ctx.status(202))
      }
    ),
    rest.post('/campaign/:campaignId/upload/complete', (req, res, ctx) => {
      const { campaignId } = req.params
      const {
        transaction_id: transactionId,
        filename,
        etag,
      } = req.body as {
        transaction_id?: string
        filename?: string
        etag?: string
      }
      if (!transactionId || !filename || !etag) {
        return res(ctx.status(400))
      }

      // Use the filename to determine if the CSV file is invalid
      // since jsdom doesn't store the file data on uploads
      if (filename === INVALID_CSV_FILENAME) {
        state.campaigns[+campaignId - 1] = {
          ...state.campaigns[+campaignId - 1],
          csv_error: 'Error: invalid recipient file',
          temp_csv_filename: filename,
        }
      } else {
        state.campaigns[+campaignId - 1] = {
          ...state.campaigns[+campaignId - 1],
          valid: true,
          num_recipients: 1,
          csv_filename: filename,
          is_csv_processing: false,
          temp_csv_filename: undefined,
          csv_error: undefined,
        }
      }

      return res(ctx.status(202))
    }),
    rest.get('/campaign/:campaignId/upload/status', (req, res, ctx) => {
      const { campaignId } = req.params

      const campaign = state.campaigns[+campaignId - 1]
      const {
        num_recipients,
        is_csv_processing,
        csv_filename,
        csv_error,
        temp_csv_filename,
      } = campaign

      let preview
      if (campaign.email_templates) {
        preview = {
          ...campaign.email_templates,
          replyTo: campaign.email_templates.reply_to,
          // Frontend doesn't have access to the actual email theme, so return
          // body as themed_body for it to render for frontend tests
          themedBody: campaign.email_templates.body,
        }
      } else if (campaign.sms_templates) {
        preview = campaign.sms_templates
      } else if (campaign.telegram_templates) {
        preview = campaign.telegram_templates
      }

      if (!preview) {
        return res(ctx.status(400))
      }

      return res(
        ctx.status(200),
        ctx.json({
          csv_error,
          csv_filename,
          is_csv_processing,
          num_recipients,
          preview,
          temp_csv_filename,
        })
      )
    }),
    rest.delete('/campaign/:campaignId/upload/status', (_req, res, ctx) => {
      return res(ctx.status(200))
    }),
  ]
}

function mockUnsubscribeApis(state: State) {
  return [
    rest.put('/unsubscribe/:campaignId/:recipient', (req, res, ctx) => {
      // Possible todo: validate the hash
      const { campaignId } = req.params
      const { h, v } = req.body as {
        h?: string
        v?: string
      }

      if (!h || !v) {
        return res(ctx.status(400))
      }

      if (+campaignId <= 0 || +campaignId > state.campaigns.length) {
        return res(
          ctx.status(400),
          ctx.json({ message: 'Invalid unsubscribe request' })
        )
      }

      return res(ctx.status(200))
    }),
    rest.delete('/unsubscribe/:campaignId/:recipient', (req, res, ctx) => {
      // Possible todo: validate the hash
      const { campaignId } = req.params
      const { h, v } = req.body as {
        h?: string
        v?: string
      }

      if (!h || !v) {
        return res(ctx.status(400))
      }

      if (+campaignId <= 0 || +campaignId > state.campaigns.length) {
        return res(
          ctx.status(400),
          ctx.json({ message: 'Invalid unsubscribe request' })
        )
      }

      return res(ctx.status(204))
    }),
  ]
}

function mockProtectApis(state: State) {
  return [
    rest.post('/protect/:id', (req, res, ctx) => {
      const { id } = req.params
      const { password_hash: passwordHash } = req.body as {
        password_hash?: string
      }

      if (!passwordHash) {
        return res(ctx.status(400))
      }

      const message = state.protectedMessages.find(
        (message) => message.id === id && message.passwordHash === passwordHash
      )
      if (!message) {
        return res(
          ctx.status(403),
          ctx.json({
            message: 'Wrong password or message id. Please try again.',
          })
        )
      }

      const { payload } = message
      return res(ctx.status(200), ctx.json({ payload }))
    }),
  ]
}

function mockPhonebookApis(state: State) {
  return [
    rest.get('/phonebook/lists/:channel', (req, res, ctx) => {
      const { channel } = req.params
      if (
        !Object.values(ChannelType).includes(channel as unknown as ChannelType)
      ) {
        return res(ctx.status(400))
      }

      return res(ctx.status(200), ctx.json({ lists: state.lists }))
    }),
    rest.put(
      '/campaign/:campaignId/phonebook-associations',
      (req, res, ctx) => {
        return res(ctx.status(200))
      }
    ),
    rest.delete(
      '/campaign/:campaignId/phonebook-associations',
      (req, res, ctx) => {
        return res(ctx.status(200))
      }
    ),
    rest.get('/campaign/:campaignId/phonebook-listid', (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({}))
    }),
  ]
}

export { mockCommonApis }
export * from './constants'
export * from './interfaces'
