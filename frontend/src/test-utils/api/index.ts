import { rest } from 'msw'
import type { State, Template } from './interfaces'
import {
  USER_EMAIL,
  TWILIO_CREDENTIAL,
  TELEGRAM_CREDENTIAL,
  DEFAULT_FROM,
  PRESIGNED_URL,
  CSV_FILENAME,
} from './constants'

function mockCommonApis(initialState?: Partial<State>) {
  const state: State = {
    // Stats
    totalMessagesSent: 0,

    // Auth
    users: [
      {
        api_key: 'test-api-key',
        creds: [
          { label: TWILIO_CREDENTIAL, type: 'SMS' },
          { label: TELEGRAM_CREDENTIAL, type: 'TELEGRAM' },
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
      return res(ctx.status(200), ctx.json(state.campaigns[campaignId - 1]))
    }),
    rest.post('/campaign/:campaignId/send', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({ campaign_id: campaignId, job_id: [1] })
      )
    }),
    rest.get('/campaign/:campaignId/stats', (req, res, ctx) => {
      const { campaignId } = req.params
      const { halted } = state.campaigns[campaignId - 1]

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
      const { halted } = state.campaigns[campaignId - 1]

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

  return [
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
        state.campaigns[campaignId - 1].protect &&
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
      state.campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = state.campaigns[campaignId - 1]

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
      state.campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = state.campaigns[campaignId - 1]

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
      state.campaigns[campaignId - 1].template = template

      const { valid, num_recipients } = state.campaigns[campaignId - 1]

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
      return res(
        ctx.status(200),
        ctx.json({
          preview: state.campaigns[campaignId - 1].template,
        })
      )
    }),
    rest.get('/campaign/:campaignId/sms/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          preview: state.campaigns[campaignId - 1].template,
        })
      )
    }),
    rest.get('/campaign/:campaignId/telegram/preview', (req, res, ctx) => {
      const { campaignId } = req.params
      return res(
        ctx.status(200),
        ctx.json({
          preview: state.campaigns[campaignId - 1].template,
        })
      )
    }),
  ]
}

function mockCampaignCredentialApis(state: State) {
  return [
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
        state.campaigns[campaignId - 1] = {
          ...state.campaigns[campaignId - 1],
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
      state.campaigns[campaignId - 1] = {
        ...state.campaigns[campaignId - 1],
        valid: true,
        num_recipients: 1,
        csv_filename: CSV_FILENAME,
      }
      return res(ctx.status(202))
    }),
    rest.get('/campaign/:campaignId/upload/status', (req, res, ctx) => {
      const { campaignId } = req.params
      if (!state.campaigns[campaignId - 1].template) {
        return res(ctx.status(400))
      }

      const { body, subject, reply_to: replyTo, from } = state.campaigns[
        campaignId - 1
      ].template as Template
      const {
        num_recipients,
        is_csv_processing,
        csv_filename,
      } = state.campaigns[campaignId - 1]

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

      if (campaignId <= 0 || campaignId > state.campaigns.length) {
        return res(
          ctx.status(400),
          ctx.json({ message: 'Invalid unsubscribe request' })
        )
      }

      return res(ctx.status(200))
    }),
  ]
}

export { mockCommonApis }
export * from './constants'
export * from './interfaces'
