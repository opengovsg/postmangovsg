const dayInMs = 24 * 60 * 60 * 1000

export const getFutureUTCDate = (numDaysFromNow: number): string => {
  // truncate to nearest day in UTC
  const now = new Date()
  const nowDateTruncated = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  return new Date(nowDateTruncated + numDaysFromNow * dayInMs).toISOString()
}
