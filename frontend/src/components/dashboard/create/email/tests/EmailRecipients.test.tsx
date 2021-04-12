import React from 'react'
import { screen, mockCommonApis, server, render } from 'test-utils'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import { Route } from 'react-router-dom'
import EmailRecipients from '../EmailRecipients'
import { EmailCampaign } from 'classes'

const TEST_EMAIL_CAMPAIGN = {
  id: 1,
  name: 'Test email campaign',
  type: 'EMAIL',
  created_at: new Date(),
  valid: false,
  protect: false,
  demo_message_limit: null,
  csv_filename: null,
  is_csv_processing: false,
  num_recipients: null,
  job_queue: [],
  halted: false,
  template: {
    body: 'Test body',
    subject: 'Test subject',
    params: [],
  },
}

function mockApis() {
  const { handlers } = mockCommonApis({
    curUserId: 1, // Start authenticated

    // Start with a freshly created email campaign
    campaigns: [{ ...TEST_EMAIL_CAMPAIGN }],
  })
  return handlers
}

function renderRecipients() {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider
        initialCampaign={new EmailCampaign({ ...TEST_EMAIL_CAMPAIGN })}
      >
        <FinishLaterModalContextProvider>
          <EmailRecipients setActiveStep={setActiveStep} />
        </FinishLaterModalContextProvider>
      </CampaignContextProvider>
    </Route>,
    {
      router: { initialIndex: 0, initialEntries: ['/campaigns/1'] },
    }
  )
}

test('displays the necessary elements', async () => {
  // Setup
  server.use(...mockApis())
  renderRecipients()

  // Wait for the component to fully load
  const uploadButton = await screen.findByRole('button', {
    name: /upload file/i,
  })

  /**
   * Assert that the following elements are present:
   * 1. "Upload File" button
   * 2. "Download a sample .csv file" button
   */
  expect(uploadButton).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /download a sample/i })
  ).toBeInTheDocument()
})
