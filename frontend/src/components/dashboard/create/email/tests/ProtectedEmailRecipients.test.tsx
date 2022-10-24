import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { EmailCampaign } from 'classes'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import {
  Campaign,
  DEFAULT_FROM,
  fireEvent,
  INVALID_EMAIL_CSV_FILE,
  mockCommonApis,
  render,
  screen,
  server,
  USER_EMAIL,
} from 'test-utils'

import ProtectedEmailRecipients from '../ProtectedEmailRecipients'

const TEST_EMAIL_CAMPAIGN: Campaign = {
  id: 1,
  name: 'Test email campaign',
  type: 'EMAIL',
  created_at: new Date(),
  valid: false,
  protect: true,
  demo_message_limit: null,
  csv_filename: null,
  is_csv_processing: false,
  num_recipients: null,
  job_queue: [],
  halted: false,
  email_templates: {
    body: 'Test body',
    subject: 'Test subject',
    params: [],
    reply_to: USER_EMAIL,
    from: DEFAULT_FROM,
  },
  has_credential: false,
}

function mockApis() {
  const { handlers } = mockCommonApis({
    curUserId: 1, // Start authenticated

    // Start with an email campaign with a saved template
    campaigns: [{ ...TEST_EMAIL_CAMPAIGN }],
  })
  return handlers
}

function renderRecipients() {
  const setActiveStep = jest.fn()

  render(
    <Routes>
      <Route
        path="/campaigns/:id"
        element={
          <CampaignContextProvider
            initialCampaign={new EmailCampaign({ ...TEST_EMAIL_CAMPAIGN })}
          >
            <FinishLaterModalContextProvider>
              <ProtectedEmailRecipients setActiveStep={setActiveStep} />
            </FinishLaterModalContextProvider>
          </CampaignContextProvider>
        }
      />
    </Routes>,
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
  const messageTextbox = screen.getByRole('textbox', {
    name: /rdw-editor/i,
  })

  // Type in a message
  fireEvent.paste(messageTextbox, {
    clipboardData: {
      getData: () => 'test message',
    },
  })
  // Upload the file
  // Note: we cannot select files via the file picker
  await userEvent.upload(fileUploadInput, INVALID_EMAIL_CSV_FILE)

  expect(fileUploadInput?.files).toHaveLength(1)
  expect(fileUploadInput?.files?.[0]).toBe(INVALID_EMAIL_CSV_FILE)

  // Assert that an error message is displayed
  expect(await screen.findByText(/errors found/i)).toBeInTheDocument()
})
