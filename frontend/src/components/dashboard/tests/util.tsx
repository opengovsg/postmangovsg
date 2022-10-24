import { mockCommonApis, render } from 'test-utils'

import Dashboard from '../Dashboard'

export const REPLY_TO = 'testEmail@open.gov.sg'
export const MESSAGE_TEXT = 'Test message'
export const UNPROTECTED_MESSAGE_TEXT = 'Test message {{protectedlink}}'
export const CAMPAIGN_NAME = 'Test campaign name'
export const SUBJECT_TEXT = 'Test subject'
export const PROTECTED_PASSWORD = 'test password'

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
