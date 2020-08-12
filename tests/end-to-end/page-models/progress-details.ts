import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'
import config from './../../config'

const statisticsTable = ReactSelector('ProgressDetails table')
  .nth(1)
  .child('tbody')

const errorCount = statisticsTable.child('tr').nth(0).child('td').nth(2)
const unsentCount = statisticsTable.child('tr').nth(1).child('td').nth(2)
const sentCount = statisticsTable.child('tr').nth(2).child('td').nth(2)
const invalidCount = statisticsTable.child('tr').nth(3).child('td').nth(2)

/**
 * Wait for all messages to be sent and check if statistics are as expected
 * @param error Number of errors expected
 * @param sent Number of messages sent successfully expected
 * @param invalid Number of invalid recipients expected
 */
const checkStatistics = async ({
  error,
  sent,
  invalid,
}: {
  error: number
  sent: number
  invalid: number
}): Promise<void> => {
  const timeout = config.get('timeout.sendComplete')
  await t.expect(unsentCount.textContent).eql('0', { timeout })
  await t.expect(errorCount.textContent).eql(`${error}`, { timeout })
  await t.expect(sentCount.textContent).eql(`${sent}`, { timeout })
  await t.expect(invalidCount.textContent).eql(`${invalid}`, { timeout })
}

export const ProgressDetailsPage = {
  checkStatistics,
}
