import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { mockCommonApis, render, screen, server } from 'test-utils'

import Protected from '../Protected'

const TEST_MESSAGE = 'test message'
const TEST_PASSWORD = 'test password'
// passwordHash and payload are determined from TEST_MESSAGE and TEST_PASSWORD
const TEST_PROTECTED_MESSAGE = {
  id: 'e7acf969-4a8j-4ebl-aeda-0a57aa50e3b2',
  passwordHash: 'dVEaRKjViDcVAeys7NG+EISz6X9KKxuXv9qScf744vs=', // pragma: allowlist secret
  payload: 'tbc7u/ENbimM25YwPbTLj16v6SN3/0jITmDIJA==.Abjs90naDmiAG7cG',
}

function mockApis() {
  const { handlers } = mockCommonApis({
    protectedMessages: [TEST_PROTECTED_MESSAGE],
  })
  return handlers
}

function renderProtected(id = TEST_PROTECTED_MESSAGE.id) {
  render(
    <Routes>
      <Route path="/p/:version/:id" element={<Protected />} />
    </Routes>,
    {
      router: {
        initialIndex: 0,
        initialEntries: [`/p/1/${id}`],
      },
    }
  )
}

test('displays the necessary elements', async () => {
  // Setup
  server.use(...mockApis())
  renderProtected()

  // Wait for the component to fully load
  const passwordTextbox = await screen.findByPlaceholderText(/password/i)
  /**
   * Assert that the following elements are present:
   * 1. "Enter password" textbox
   * 2. "Access Mail" button"
   * 3. Gov banner
   */
  expect(passwordTextbox).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /access/i })).toBeInTheDocument()
  expect(
    screen.getByText(/singapore government agency website/i)
  ).toBeInTheDocument()
})

test('successfully decrypts and displays a protected message', async () => {
  // Setup
  server.use(...mockApis())
  renderProtected()

  // Wait for the component to fully load
  const passwordTextbox = await screen.findByPlaceholderText(/password/i)

  // Enter and submit a password
  await userEvent.type(passwordTextbox, TEST_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: /access/i }))

  // Wait for the protected message to be fully loaded
  const messageText = await screen.findByText(TEST_MESSAGE)

  // Assert that the message is displayed
  expect(messageText).toBeInTheDocument()
})

test('displays an error when attempting to view a messagge with an invalid ID', async () => {
  // Setup
  jest.spyOn(console, 'error').mockImplementation(() => {
    //Silence
  })
  server.use(...mockApis())
  renderProtected('invalid-id')

  // Wait for the component to fully load
  const passwordTextbox = await screen.findByPlaceholderText(/password/i)

  // Enter and submit a password
  await userEvent.type(passwordTextbox, TEST_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: /access/i }))

  // Assert that an error is displayed
  expect(
    await screen.findByText(/wrong password or message id/i)
  ).toBeInTheDocument()

  // Teardown
  jest.restoreAllMocks()
})

test('displays an error when attempting to view a message with an invalid password', async () => {
  // Setup
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Silence
  })
  server.use(...mockApis())
  renderProtected()

  // Wait for the component to fully load
  const passwordTextbox = await screen.findByPlaceholderText(/password/i)

  // Enter and submit a password
  await userEvent.type(passwordTextbox, 'invalid password')
  await userEvent.click(screen.getByRole('button', { name: /access/i }))

  // Assert that an error is displayed
  expect(
    await screen.findByText(/wrong password or message id/i)
  ).toBeInTheDocument()

  // Teardown
  jest.restoreAllMocks()
})
