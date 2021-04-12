import React from 'react'
import { screen, mockCommonApis, server, render } from 'test-utils'
import SMSTemplate from '../SMSTemplate'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'

function mockApis() {
  const { handlers } = mockCommonApis({
    // Start with a freshly created SMS campaign
    campaigns: [
      {
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
          <SMSTemplate setActiveStep={setActiveStep} />
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
  renderTemplatePage()

  // Wait for the component to fully load
  const heading = await screen.findByRole('heading', {
    name: /create message template/i,
  })

  /**
   * Assert that the following elements are present:
   * 1. "Create message template" heading
   * 2. Message template textbox
   * 3. "Next" button
   * 4. Character count textbox
   */
  expect(heading).toBeInTheDocument()
  expect(
    screen.getByRole('textbox', {
      name: /message/i,
    })
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  expect(screen.getByText(/characters/i)).toBeInTheDocument()
})

test('next button is disabled when template is empty', async () => {
  // Setup
  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const nextButton = screen.getByRole('button', {
    name: /next/i,
  })

  // Assert that the next button is initially disabled since the textbox is empty
  expect(templateTextbox).toHaveValue('')
  expect(nextButton).toBeDisabled()

  // Type something in the textbox and erase it
  userEvent.type(templateTextbox, 'test body')
  userEvent.clear(templateTextbox)

  // Assert that the next button is disabled after clearing the text
  expect(nextButton).toBeDisabled()
})

test('next button is enabled when the template is filled', async () => {
  // Setup
  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const nextButton = screen.getByRole('button', {
    name: /next/i,
  })

  // Type something in the textbox
  const TEST_BODY = 'test body'
  userEvent.type(templateTextbox, TEST_BODY)
  expect(templateTextbox).toHaveValue(TEST_BODY)

  // Assert that the next button is enabled
  expect(nextButton).toBeEnabled()
})

test('character count text reflects the actual number of characters in the textbox', async () => {
  // Setup
  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const characterCountText = screen.getByText(/characters/i)

  // Test against various templates
  const TEST_TEMPLATES = ['Letter wooded', '1234567890']
  for (const template of TEST_TEMPLATES) {
    // Type the template text into the textbox
    userEvent.clear(templateTextbox)
    userEvent.type(templateTextbox, template)

    // Assert that the character count is the same as the number of characters in the corpus
    expect(characterCountText).toHaveTextContent(
      `${template.length} characters`
    )
  }
})

test('displays an error if the template is invalid', async () => {
  // Setup
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Do nothing. Mock console.error to silence expected errors
    // due to submitting invalid templates to the API
  })
  server.use(...mockApis())
  renderTemplatePage()

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const nextButton = screen.getByRole('button', { name: /next/i })

  // Test against various invalid templates
  const TEST_TEMPLATES = ['<hehe>', '<script>']
  for (const template of TEST_TEMPLATES) {
    // Type the template text into the textbox
    userEvent.clear(templateTextbox)
    userEvent.type(templateTextbox, template)

    // Click the next button to submit the template
    userEvent.click(nextButton)

    // Assert that an error message is shown
    expect(
      await screen.findByText(/message template is invalid/i)
    ).toBeInTheDocument()
  }

  // Teardown
  jest.restoreAllMocks()
})
