import userEvent from '@testing-library/user-event'

import { Route } from 'react-router-dom'
import { SegmentedMessage } from 'sms-segments-calculator'

import BodyTemplate from '../BodyTemplate'

import { EmailCampaign, SMSCampaign } from 'classes'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterModalContextProvider from 'contexts/finish-later.modal.context'
import { saveTemplate as saveSmsTemplate } from 'services/sms.service'
import { saveTemplate as saveTelegramTemplate } from 'services/telegram.service'
import { screen, mockCommonApis, server, render, Campaign } from 'test-utils'

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
  has_credential: false,
  cost_per_message: 0.0395,
}

function mockApis() {
  const { handlers } = mockCommonApis({
    // Start with a freshly created SMS campaign
    campaigns: [{ ...TEST_SMS_CAMPAIGN }],
  })
  return handlers
}

function renderSmsTemplatePage(
  saveTemplate: typeof BodyTemplate.arguments.saveTemplate
) {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider initialCampaign={new SMSCampaign({})}>
        <FinishLaterModalContextProvider>
          <BodyTemplate
            setActiveStep={setActiveStep}
            saveTemplate={saveTemplate}
            warnCharacterCount={5}
            errorCharacterCount={10}
          />
        </FinishLaterModalContextProvider>
      </CampaignContextProvider>
    </Route>,
    {
      router: { initialIndex: 0, initialEntries: ['/campaigns/1'] },
    }
  )
}

function renderEmailTemplatePage(
  saveTemplate: typeof BodyTemplate.arguments.saveTemplate
) {
  const setActiveStep = jest.fn()

  render(
    <Route path="/campaigns/:id">
      <CampaignContextProvider initialCampaign={new EmailCampaign({})}>
        <FinishLaterModalContextProvider>
          <BodyTemplate
            setActiveStep={setActiveStep}
            saveTemplate={saveTemplate}
            warnCharacterCount={5}
            errorCharacterCount={10}
          />
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
  renderSmsTemplatePage(jest.fn())

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
  renderSmsTemplatePage(jest.fn())

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
  await userEvent.type(templateTextbox, 'test body')
  await userEvent.clear(templateTextbox)

  // Assert that the next button is disabled after clearing the text
  expect(nextButton).toBeDisabled()
})

test('next button is enabled when the template is filled', async () => {
  // Setup
  server.use(...mockApis())
  renderSmsTemplatePage(jest.fn())

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const nextButton = screen.getByRole('button', {
    name: /next/i,
  })

  // Type something in the textbox
  const TEST_BODY = 'test body'
  await userEvent.type(templateTextbox, TEST_BODY)
  expect(templateTextbox).toHaveValue(TEST_BODY)

  // Assert that the next button is enabled
  expect(nextButton).toBeEnabled()
})

test('character count text reflects the actual number of characters in the textbox', async () => {
  // Setup
  server.use(...mockApis())
  renderSmsTemplatePage(jest.fn())

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const characterCountText = screen.getByText(/characters/i)

  // Test against various templates
  const TEST_TEMPLATES = ['Letter wooded', '1234567890']
  for (const template of TEST_TEMPLATES) {
    // Type the template text into the textbox
    await userEvent.clear(templateTextbox)
    await userEvent.type(templateTextbox, template)

    // Assert that the character count is the same as the number of characters in the corpus
    expect(characterCountText).toHaveTextContent(
      `${template.length} characters`
    )
  }
})

test('SMS cost should be correct for SMS campaign body template', async () => {
  // Setup
  server.use(...mockApis())
  renderSmsTemplatePage(jest.fn())

  // Wait for the component to fully load
  const templateTextbox = await screen.findByRole('textbox', {
    name: /message/i,
  })
  const smsCampaignInfoText = screen.getByText(
    /This SMS will cost approximately SGD/i
  )

  // Test against various templates
  const TEST_TEMPLATES = [
    '你好 你好 你好 hello hello hello 你好 你好 你好 hello hello hello 你好 你好 你好 hello hello hello 你好 你好 你好 hello hello',
    'the quick brown fox jumped over the lazy dog the quick brown fox jumped over the lazy dog the quick brown fox jumped over the lazy dog the quick brown fox',
  ]
  for (const template of TEST_TEMPLATES) {
    // Type the template text into the textbox
    await userEvent.clear(templateTextbox)
    await userEvent.type(templateTextbox, template)

    const COST_PER_TWILIO_SMS_SEGMENT_IN_USD = TEST_SMS_CAMPAIGN.cost_per_message!
    const USD_SGD_RATE = 1.4 // correct as at 11 Jun 2022
    const COST_PER_TWILIO_SMS_SEGMENT_IN_SGD =
      COST_PER_TWILIO_SMS_SEGMENT_IN_USD * USD_SGD_RATE
    const segmentedMessage = new SegmentedMessage(template)
    const segmentEncoding = segmentedMessage.encodingName
    const segmentCount = segmentedMessage.segmentsCount
    const smsCampaignExpectedText = `This SMS will cost approximately SGD ${(
      segmentCount * COST_PER_TWILIO_SMS_SEGMENT_IN_SGD
    ).toFixed(
      3
    )}.This estimate is calculated based on Twilio's pricing. Find out more here.${
      template.length
    } characters | ${segmentCount} message segment(s) | ${segmentEncoding} encoding`

    // Assert that the character count is the same as the number of characters in the corpus
    expect(smsCampaignInfoText).toHaveTextContent(smsCampaignExpectedText)
  }
})

test('SMS cost should not appear in the email campaign body template', async () => {
  // Setup
  server.use(...mockApis())
  renderEmailTemplatePage(jest.fn())

  const smsCampaignInfoText = screen.queryByText(
    /This SMS will cost approximately SGD/i
  )

  // Assert that the SMS campaign info text should not exist in the email campaign body template
  expect(smsCampaignInfoText).toBe(null)
})

describe('displays an error if the template is invalid', () => {
  async function runTest() {
    // Wait for the component to fully load
    const templateTextbox = await screen.findByRole('textbox', {
      name: /message/i,
    })
    const nextButton = screen.getByRole('button', { name: /next/i })

    // Test against various invalid templates
    const TEST_TEMPLATES = ['<hehe>', '<script>']
    for (const template of TEST_TEMPLATES) {
      // Type the template text into the textbox
      await userEvent.clear(templateTextbox)
      await userEvent.type(templateTextbox, template)

      // Click the next button to submit the template
      await userEvent.click(nextButton)

      // Assert that an error message is shown
      expect(
        await screen.findByText(/message template is invalid/i)
      ).toBeInTheDocument()
    }
  }

  beforeEach(() => {
    // Setup
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Do nothing. Mock console.error to silence expected errors
      // due to submitting invalid templates to the API
    })
    server.use(...mockApis())
  })

  afterEach(() => {
    // Teardown
    jest.restoreAllMocks()
  })

  test('sms', async () => {
    // Setup
    renderSmsTemplatePage(saveSmsTemplate)

    await runTest()
  })

  test('email', async () => {
    // Setup
    renderSmsTemplatePage(saveTelegramTemplate)

    await runTest()
  })
})
