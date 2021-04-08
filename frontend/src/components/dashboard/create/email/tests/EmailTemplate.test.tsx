import React from 'react'
import { screen, mockCommonApis, server, render } from 'test-utils'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import EmailTemplate from '../EmailTemplate'

function mockApis() {
  const { handlers } = mockCommonApis({
    // Start with a freshly created email campaign
    campaigns: [
      {
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
      },
    ],
  })
  return handlers
}

function renderTemplatePage() {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider>
        <FinishLaterModalContextProvider>
          <EmailTemplate setActiveStep={setActiveStep} />
        </FinishLaterModalContextProvider>
      </CampaignContextProvider>
    </Route>,
    {
      router: { initialIndex: 0, initialEntries: ['/campaigns/1'] },
    }
  )
}

test('displays the necessary elements', async () => {
  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const heading = await screen.findByRole('heading', {
    name: /create email message/i,
  })

  /**
   * Assert that the following elements are present:
   * 1. "Create email message" heading
   * 2. From address dropdown
   * 3. Subject textbox
   * 4. Message textbox
   * 5. Reply-to textbox
   * 6. Next button
   */
  expect(heading).toBeInTheDocument()
  expect(
    screen.getByRole('textbox', {
      name: /subject/i,
    })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('textbox', { name: /rdw-editor/i })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('textbox', {
      name: /replies/i,
    })
  )
  expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
})

test('displays an error if the subject is invalid', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Do nothing. Mock console.error to silence expected errors
    // due to submitting invalid templates to the API
  })

  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const subjectTextbox = await screen.findByRole('textbox', {
    name: /subject/i,
  })
  const nextButton = screen.getByRole('button', { name: /next/i })

  // Test against various invalid templates
  const TEST_TEMPLATES = ['<hehe>', '<script>']
  for (const template of TEST_TEMPLATES) {
    // Type the template text into the textbox
    userEvent.clear(subjectTextbox)
    userEvent.type(subjectTextbox, template)

    // Click the next button to submit the template
    userEvent.click(nextButton)

    // Assert that an error message is shown
    expect(
      await screen.findByText(/message template is invalid/i)
    ).toBeInTheDocument()
  }

  jest.restoreAllMocks()
})
