import { EmailBlacklist } from '@email/models'

/**
 * Returns true if email blacklisted.
 */
export async function isBlacklisted(recipientEmail: string): Promise<boolean> {
  const result = await EmailBlacklist.findOne({
    where: {
      recipient: recipientEmail,
    },
  })
  return !!result
}
