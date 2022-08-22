import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'

import Unsubscribe from '../Unsubscribe'

import { render, mockCommonApis, server, screen } from 'test-utils'

function mockApis() {
  const { handlers } = mockCommonApis({
    campaigns: [
      {
        id: 1,
        name: 'Test email campaign',
        type: 'EMAIL',
        created_at: new Date(),
        valid: true,
        protect: false,
        demo_message_limit: null,
        csv_filename: 'test_csv_filename.csv',
        is_csv_processing: false,
        num_recipients: 1,
        job_queue: [],
        halted: false,
        has_credential: false,
      },
    ],
  })
  return handlers
}

function renderUnsubscribe() {
  render(
    <Route exact path="/unsubscribe/:version">
      <Unsubscribe />
    </Route>,
    {
      router: {
        initialIndex: 0,
        initialEntries: ['/unsubscribe/v1?c=1&r=testEmail@open.gov.sg&h=testH'],
      },
    }
  )
}

test('successfully unsubscribes user from a campaign', async () => {
  // Setup
  server.use(...mockApis())
  renderUnsubscribe()

  // Wait for the component to fully load
  const unsubscribeButton = await screen.findByRole('button', {
    name: /unsubscribe me/i,
  })

  // Click on the unsubscribe button
  await userEvent.click(unsubscribeButton)

  // Assert that the unsubscription succeeded
  const heading = await screen.findByRole('heading', {
    name: /unsubscribed successfully/i,
  })
  expect(heading).toBeInTheDocument()
})

test('displays thank you page when user does not unsubscribe', async () => {
  // Setup
  server.use(...mockApis())
  renderUnsubscribe()

  // Wait for the component to fully load
  const stayButton = await screen.findByRole('button', {
    name: /stay/i,
  })

  // Click on the stay button
  await userEvent.click(stayButton)

  // Assert that the thank you page is fully displayed
  expect(
    await screen.findByRole('heading', { name: /excellent choice/i })
  ).toBeInTheDocument()
  expect(screen.getByText(/thank you/i)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /hero/i })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /postman logo/i })).toBeInTheDocument()
  expect(
    screen.getByText(/a singapore government agency website/i)
  ).toBeInTheDocument()
})
