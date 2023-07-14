const dayInMs = 24 * 60 * 60 * 1000

export const getDayTruncatedISOStringDaysFromNow = (
  numDays: number,
): string => {
  // truncate to nearest day in UTC
  const now = new Date()
  const nowDateTruncated = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  console.log({ nowDateTruncated })
  return new Date(nowDateTruncated + numDays * dayInMs).toISOString()
}
