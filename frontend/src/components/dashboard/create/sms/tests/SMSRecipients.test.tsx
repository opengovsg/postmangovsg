import React from 'react'
import userEvent from '@testing-library/user-event'
import {
  screen,
  mockCommonApis,
  server,
  render,
  Campaign,
  INVALID_MOBILE_CSV_FILE,
} from 'test-utils'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import { Route } from 'react-router-dom'
import SMSRecipients from '../SMSRecipients'
import { SMSCampaign } from 'classes'

const TEST_SMS_CAMPAIGN: Campaign = {
  id: 1,
  name: 'Test SMS campaign',
  type: 'SMS',
  created_at: new Date(),
  valid: false,
  protect: false,
  demo_message_limit: null,
  csv_filename: null,
  is_csv_processing: false,
  num_recipients: null,
  job_queue: [],
  halted: false,
  sms_templates: {
    body: 'Test body',
    params: [],
  },
  has_credential: false,
}

function mockApis() {
  const { handlers } = mockCommonApis({
    curUserId: 1, // Start authenticated

    // Start with an SMS campaign with a saved template
    campaigns: [{ ...TEST_SMS_CAMPAIGN }],
  })
  return handlers
}

function renderRecipients() {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider
        initialCampaign={new SMSCampaign({ ...TEST_SMS_CAMPAIGN })}
      >
        <FinishLaterModalContextProvider>
          <SMSRecipients setActiveStep={setActiveStep} />
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

test('displays an error message after uploading an invalid recipients list', async () => {
  // Setup
  server.use(...mockApis())
  renderRecipients()

  // Wait for the component to fully load
  const fileUploadInput = (await screen.findByLabelText(
    /upload file/i
  )) as HTMLInputElement

  // Upload the file
  // Note: we cannot select files via the file picker
  userEvent.upload(fileUploadInput, INVALID_MOBILE_CSV_FILE)
  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(INVALID_MOBILE_CSV_FILE)

  // Assert that an error message is displayed
  expect(
    await screen.findByText(/error: invalid recipient file/i)
  ).toBeInTheDocument()
})
