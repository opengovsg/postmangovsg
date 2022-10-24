import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { TelegramCampaign } from 'classes'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import {
  Campaign,
  INVALID_TELEGRAM_CREDENTIAL,
  mockCommonApis,
  render,
  screen,
  server,
  TELEGRAM_CREDENTIAL,
} from 'test-utils'

import TelegramCredentials from '../TelegramCredentials'

const TEST_TELEGRAM_CAMPAIGN: Campaign = {
  id: 1,
  name: 'Test Telegram campaign',
  type: 'TELEGRAM',
  created_at: new Date(),
  valid: false,
  protect: false,
  demo_message_limit: null,
  csv_filename: 'test_recipients.csv',
  is_csv_processing: false,
  num_recipients: 1, // CSV already uploaded
  job_queue: [],
  halted: false,
  telegram_templates: {
    body: 'Test body',
    params: [],
  },
  has_credential: false,
}

function mockApis() {
  const { handlers } = mockCommonApis({
    curUserId: 1, // start authenticated
    campaigns: [{ ...TEST_TELEGRAM_CAMPAIGN }],
  })
  return handlers
}

function renderTelegramCredentials() {
  const setActiveStep = jest.fn()

  render(
    <Routes>
      <Route
        path="/campaigns/:id/*"
        element={
          <CampaignContextProvider
            initialCampaign={
              new TelegramCampaign({ ...TEST_TELEGRAM_CAMPAIGN })
            }
          >
            <FinishLaterModalContextProvider>
              <TelegramCredentials setActiveStep={setActiveStep} />
            </FinishLaterModalContextProvider>
          </CampaignContextProvider>
        }
      />
    </Routes>,
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
  renderTelegramCredentials()

  // Wait for the component to fully load
  const credentialDropdown = await screen.findByRole('listbox', {
    name: /credential/i,
  })
  const credentialLabelText = await screen.findByRole('option', {
    name: TELEGRAM_CREDENTIAL,
  })

  /**
   * Assert that the following elements are present:
   * 1. Credential dropdown
   * 2. Credential label text
   * 3. "Add new credential" button
   * 4. "Validate credential" button
   */
  expect(credentialDropdown).toBeInTheDocument()
  expect(credentialLabelText).toBeInTheDocument()
  expect(
    screen.getByRole('button', {
      name: /add new credentials/i,
    })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', {
      name: /validate credentials/i,
    })
  ).toBeInTheDocument()
})

test('displays an error when attempting to validate an invalid credential', async () => {
  // Setup
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Silence
  })
  server.use(...mockApis())
  renderTelegramCredentials()

  // Wait for the component to fully load
  const credentialDropdown = await screen.findByRole('listbox', {
    name: /credential/i,
  })
  const credentialLabelText = await screen.findByRole('option', {
    name: INVALID_TELEGRAM_CREDENTIAL,
  })

  // Select the invalid credential label
  await userEvent.click(credentialDropdown)
  await userEvent.click(credentialLabelText)

  // Attempt to validate the credential
  await userEvent.click(
    screen.getByRole('button', {
      name: /validate credentials/i,
    })
  )

  // Assert that an error is displayed
  expect(
    await screen.findByText(/error validating credentials/i)
  ).toBeInTheDocument()
})
