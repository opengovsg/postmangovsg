import { Config } from 'sst/node/config'

import { getSequelize } from '@/core/database/client'

import { IS_LOCAL, LOCAL_DB_URI } from '../../env'

import { getUnsubscribeList, sendEmailAndUpdate } from './helper'

export async function handler() {
  try {
    if (IS_LOCAL) {
      console.log('Running cron locally')
      await sendUnsubDigest()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cronitor = require('cronitor')(Config.CRONITOR_URL_SUFFIX) // common to all jobs on our shared Cronitor account
    const invokeFunction = cronitor.wrap(
      Config.CRONITOR_CODE_UNSUB_DIGEST,
      async function () {
        await sendUnsubDigest()
      },
    )
    await invokeFunction()
  } catch (error) {
    console.log(error)
    throw error
  }
}

async function sendUnsubDigest() {
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI
  const sequelize = getSequelize(dbUri)
  // retrieve unsubscribed recipients grouped by campaigns and users
  const unsubscribeDigests = await getUnsubscribeList(sequelize)

  // generate email digest and send email to each user
  for (const userDigest of unsubscribeDigests) {
    await sendEmailAndUpdate(userDigest, sequelize)
  }
}
