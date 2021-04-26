import React from 'react'
import Dashboard from '../Dashboard'
import { mockCommonApis, CSV_FILENAME, render } from 'test-utils'

export const REPLY_TO = 'testEmail@open.gov.sg'
export const MESSAGE_TEXT = 'Test message'
export const UNPROTECTED_MESSAGE_TEXT = 'Test message {{protectedlink}}'
export const CAMPAIGN_NAME = 'Test campaign name'
export const SUBJECT_TEXT = 'Test subject'
export const RECIPIENT_EMAIL = 'testEmailRecipient@gmail.com'
export const RECIPIENT_NUMBER = '89898989'
export const PROTECTED_PASSWORD = 'test password'
export const EMAIL_CSV_FILE = new File(
  [`recipient,password\n${RECIPIENT_EMAIL},${PROTECTED_PASSWORD}`],
  CSV_FILENAME,
  {
    type: 'text/csv',
  }
)
export const MOBILE_CSV_FILE = new File(
  [`recipient\n${RECIPIENT_NUMBER}`],
  CSV_FILENAME,
  {
    type: 'text/csv',
  }
)

export function mockApis() {
  const { handlers } = mockCommonApis({
    curUserId: 1, // Start out authenticated; 1-indexed
  })
  return handlers
}

export const renderDashboard = () =>
  render(<Dashboard />, {
    router: { initialIndex: 0, initialEntries: ['/campaigns'] },
  })
