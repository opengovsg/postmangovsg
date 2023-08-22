import axios from 'axios'
import { sql } from 'drizzle-orm'
import { Config } from 'sst/node/config'

import PostmanDbClient from '@/core/database/client'
import { govsgMessages } from '@/core/models'

export async function handler() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cronitor = require('cronitor')(Config.CRONITOR_URL_SUFFIX) // common to all jobs on our shared Cronitor account
    const invokeFunction =
      process.env.IS_LOCAL === 'true'
        ? async function () {
            console.log('Running cron locally')
            await checkMessagesNotGettingWebhooks()
          }
        : cronitor.wrap(
            Config.CRONITOR_CODE_GOVSG_WEBHOOK_MONITOR,
            async function () {
              await checkMessagesNotGettingWebhooks()
            },
          )
    await invokeFunction()
  } catch (error) {
    console.log(error)
    throw error
  }
}

async function checkMessagesNotGettingWebhooks() {
  const db = new PostmanDbClient(Config.POSTMAN_DB_URI).getClient()
  const noWebhookMessages = await db
    .select({})
    .from(govsgMessages)
    .where(
      // the reason we want to query for the previous 10-minute block instead of
      // the immediate one is to prevent messages from campaigns currently being sent
      // out from being flagged (This is assuming a campaign won't take more than
      // 10 minutes to receive all the `SENT` webhooks)
      sql`status = 'ACCEPTED' AND updated_at < NOW() - INTERVAL '10 minutes' AND updated_at >= NOW() - INTERVAL '20 minutes'`,
    )
  if (noWebhookMessages.length === 0) {
    return
  }
  try {
    await axios.post(Config.SGC_ALERT_WEBHOOK, {
      text: `<!subteam^S03JWLMTBTK|postmangineers>\n***NEW ALERT***\nThere're ${noWebhookMessages.length} messages that didn't get a webhook.\n******`,
    })
  } catch (e) {
    console.log({
      message: 'Error in govsg-webhook-monitor slack posting',
      error: e,
    })
  }
}
