import userEvent from '@testing-library/user-event'
import { SMSCampaign } from 'classes'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import React from 'react'
import { Route } from 'react-router'
import {
  mockCommonApis,
  render,
  server,
  TWILIO_CREDENTIAL,
  screen,
  INVALID_TWILIO_CREDENTIAL,
} from 'test-utils'
import SMSCredentials from '../SMSCredentials'

const TEST_SMS_CAMPAIGN = {
  id: 1,
  name: 'Test SMS campaign',
  type: 'SMS',
  created_at: new Date(),
  valid: false,
  protect: false,
  demo_message_limit: null,
  csv_filename: 'test_recipients.csv',
  is_csv_processing: false,
  num_recipients: 1, // CSV already uploaded
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
    curUserId: 1, // start authenticated
    campaigns: [{ ...TEST_SMS_CAMPAIGN }],
  })
  return handlers
}

function renderSMSCredentials() {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider
        initialCampaign={new SMSCampaign({ ...TEST_SMS_CAMPAIGN })}
      >
        <FinishLaterModalContextProvider>
          <SMSCredentials setActiveStep={setActiveStep} />
        </FinishLaterModalContextProvider>
      </CampaignContextProvider>
    </Route>,
    {
      router: {
        initialIndex: 0,
        initialEntries: ['/campaigns/1'],
      },
    }
  )
}

test('displays the necessary elements', async () => {
  // Setup
  server.use(...mockApis())
  renderSMSCredentials()

  // Wait for the component to fully load
  const credentialDropdown = await screen.findByRole('listbox', {
    name: /credential/i,
  })
  const credentialLabelText = await screen.findByText(TWILIO_CREDENTIAL)

  /**
   * Assert that the following elements are present:
   * 1. Credential dropdown
   * 2. Populated credential labels
   * 3. Validation textbox
   * 4. Validation button
   */
  expect(credentialDropdown).toBeInTheDocument()
  expect(credentialLabelText).toBeInTheDocument()
  expect(
    screen.getByRole('textbox', {
      name: /send a test sms/i,
    })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /send test sms/i })
  ).toBeInTheDocument()
})

test('displays an error when attempting to validate an invalid credential', async () => {
  // Setup
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Silence
  })
  server.use(...mockApis())
  renderSMSCredentials()

  // Wait for the component to fully load
  const credentialDropdown = await screen.findByRole('listbox', {
    name: /credential/i,
  })
  await screen.findByText(TWILIO_CREDENTIAL)
  const testNumberTextbox = screen.getByRole('textbox', {
    name: /send a test sms/i,
  })
  const sendTestButton = screen.getByRole('button', { name: /send test sms/i })

  // Select the invalid credential label
  userEvent.click(credentialDropdown)
  userEvent.click(
    await screen.findByRole('option', {
      name: INVALID_TWILIO_CREDENTIAL,
    })
  )

  // Attempt to validate the credential
  userEvent.type(testNumberTextbox, '89898989')
  userEvent.click(sendTestButton)

  // Assert that an error is displayed
  expect(
    await screen.findByText(/error validating credentials/i)
  ).toBeInTheDocument()

  // Teardown
  jest.restoreAllMocks()
})
