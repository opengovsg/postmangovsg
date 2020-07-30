import {
  init,
  getUnsubscribeList,
  sendEmailAndUpdateUnsubscribers,
} from './unsubscribe'

const handler = async (): Promise<{ statusCode: number }> => {
  try {
    await init()

    // Retreive unsubscribed recipients grouped by campaigns and users
    const unsubscribeDigests = await getUnsubscribeList()

    // generate email digest and send email to each user
    for (const userDigest of unsubscribeDigests) {
      await sendEmailAndUpdateUnsubscribers(userDigest)
    }
  } catch (err) {
    console.error(err)
    // Rethrow error so that Lambda will recognize this as a failed invocation
    throw err
  }

  return {
    statusCode: 200,
  }
}

export { handler }
