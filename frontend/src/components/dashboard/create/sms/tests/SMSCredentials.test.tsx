import userEvent from '@testing-library/user-event'

import { Route } from 'react-router'

import SMSCredentials from '../SMSCredentials'

import { SMSCampaign } from 'classes'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import 'locales'
import {
  mockCommonApis,
  render,
  server,
  TWILIO_CREDENTIAL,
  screen,
  INVALID_TWILIO_CREDENTIAL,
  Campaign,
} from 'test-utils'

const TEST_SMS_CAMPAIGN: Campaign = {
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
  sms_templates: {
    body: 'Test body',
    params: [],
  },
  has_credential: false,
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
  const credentialLabelText = await screen.findByRole('option', {
    name: TWILIO_CREDENTIAL,
  })

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
  const credentialLabelText = await screen.findByRole('option', {
    name: INVALID_TWILIO_CREDENTIAL,
  })
  const testNumberTextbox = screen.getByRole('textbox', {
    name: /send a test sms/i,
  })
  const sendTestButton = screen.getByRole('button', { name: /send test sms/i })

  // Select the invalid credential label
  await userEvent.click(credentialDropdown)
  await userEvent.click(credentialLabelText)

  // Attempt to validate the credential
  await userEvent.type(testNumberTextbox, '89898989')
  await userEvent.click(sendTestButton)

  // Assert that an error is displayed
  expect(
    await screen.findByText(/error validating credentials/i)
  ).toBeInTheDocument()

  // Teardown
  jest.restoreAllMocks()
})
