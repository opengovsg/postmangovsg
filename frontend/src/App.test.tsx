import React from 'react'
import { within, render, screen } from './test-utils'
import App from 'App'

test('renders with no errors', async () => {
  render(<App />, { router: { initialIndex: 0, initialEntries: ['/'] } })

  // Wait for app the load and ensure that the necessary elements are present
  const navigation = await screen.findByRole('navigation')
  expect(navigation).toBeInTheDocument()
  expect(
    screen.getByRole('img', {
      name: /postman logo/i,
    })
  ).toBeInTheDocument()
  expect(
    screen.getAllByRole('link', {
      name: /guide/i,
    })
  ).toHaveLength(2)
  expect(
    within(navigation).getByRole('link', { name: /guide/i })
  ).toBeInTheDocument()
  expect(
    within(navigation).getByRole('link', { name: /contribute/i })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', {
      name: /need help\?/i,
    })
  ).toBeInTheDocument()
})
