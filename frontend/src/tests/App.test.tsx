import { mockCommonApis, render, screen, server, within } from 'test-utils'

import App from '../App'

test('displays landing page when unauthenticated', async () => {
  // Setup
  const { handlers } = mockCommonApis()
  server.use(...handlers)
  render(<App />, { router: { initialIndex: 0, initialEntries: ['/'] } })

  // Wait for the page to fully load
  const navigation = await screen.findByRole('navigation')

  /**
   * Assert that the following elements are present in the navigation header:
   * 1. Postman logo
   * 2. "Sign in" button
   * 3. "Guide" link
   * 4. "Contribute" link
   */
  expect(
    within(navigation).getByRole('img', {
      name: /postman logo/i,
    })
  ).toBeInTheDocument()
  expect(
    within(navigation).getByRole('button', { name: /sign in/i })
  ).toBeInTheDocument()
  expect(
    within(navigation).getByRole('link', { name: /guide/i })
  ).toBeInTheDocument()
  expect(
    within(navigation).getByRole('link', { name: /contribute/i })
  ).toBeInTheDocument()

  /**
   * Assert that the following elements are present in the landing area:
   * 1. "Sign in" button
   * 2. "Need help? Talk to us" link
   * 3. Pigeon landing animation
   * 4. Sent message count
   */
  expect(screen.getAllByRole('button', { name: /sign in/i })).toHaveLength(2)
  expect(
    screen.getByRole('link', {
      name: /need help\?/i,
    })
  ).toBeInTheDocument()
  expect(screen.getByText(/messages sent/i)).toBeInTheDocument()

  /**
   * Assert that the following elements are present in the footer:
   * 1. "Guide" link
   * 2. "Contribute" link
   * 3. "Privacy" link
   * 4. "Terms of use" link
   * 5. "Report vulnerability" link
   * 6. OGP logo
   * 7. OGP copyright
   */
  const footer = screen.getByRole('contentinfo')
  expect(
    within(footer).getByRole('link', {
      name: /guide/i,
    })
  ).toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: /contribute/i })
  ).toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: /privacy/i })
  ).toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: /terms of use/i })
  ).toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: /report vulnerability/i })
  ).toBeInTheDocument()
  expect(
    within(footer).getAllByRole('img', {
      name: /logo/i,
    })
  ).toHaveLength(2)
  expect(
    within(footer).getByText(/© \d+ open government products/i)
  ).toBeInTheDocument()
})
