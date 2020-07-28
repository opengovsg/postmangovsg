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
  }

  return {
    statusCode: 200,
  }
}

handler()

export { handler }
