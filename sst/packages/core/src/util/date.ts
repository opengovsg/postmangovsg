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

export const convertToSGTLocaleString = (isoString: string) => {
  const date = new Date(isoString)
  // example output: 'Thursday, January 4, 2024 at 2:54 PM'
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Singapore',
    hour12: true,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
