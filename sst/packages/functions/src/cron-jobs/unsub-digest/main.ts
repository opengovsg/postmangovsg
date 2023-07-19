import { Config } from 'sst/node/config'

import { getSequelize } from '@/core/database/client'

import { IS_LOCAL, LOCAL_DB_URI } from '../../env'

import { getUnsubscribeList, sendEmailAndUpdate } from './helper'

export async function handler() {
  try {
    const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI
    const sequelize = getSequelize(dbUri)
    // retrieve unsubscribed recipients grouped by campaigns and users
    const unsubscribeDigests = await getUnsubscribeList(sequelize)

    // generate email digest and send email to each user
    for (const userDigest of unsubscribeDigests) {
      await sendEmailAndUpdate(userDigest, sequelize)
    }
  } catch (err) {
    console.error(err)
    throw err
  }
}
