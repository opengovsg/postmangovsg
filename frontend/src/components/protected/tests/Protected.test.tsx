import userEvent from '@testing-library/user-event'
import React from 'react'
import { Route } from 'react-router'
import { screen, mockCommonApis, render, server } from 'test-utils'
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

function renderProtected() {
  render(
    <Route exact path="/p/:version/:id">
      <Protected />
    </Route>,
    {
      router: {
        initialIndex: 0,
        initialEntries: [`/p/1/${TEST_PROTECTED_MESSAGE.id}`],
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
    screen.getByRole('link', { name: /singapore government agency website/i })
  ).toBeInTheDocument()
})

test('successfully decrypts and displays a protected message', async () => {
  // Setup
  server.use(...mockApis())
  renderProtected()

  // Wait for the component to fully load
  const passwordTextbox = await screen.findByPlaceholderText(/password/i)

  // Enter and submit a password
  userEvent.type(passwordTextbox, TEST_PASSWORD)
  userEvent.click(screen.getByRole('button', { name: /access/i }))

  // Wait for the protected message to be fully loaded
  const messageText = await screen.findByText(TEST_MESSAGE)

  // Assert that the message is displayed
  expect(messageText).toBeInTheDocument()
})
