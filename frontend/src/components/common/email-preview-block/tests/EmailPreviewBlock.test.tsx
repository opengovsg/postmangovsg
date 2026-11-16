import { render, screen } from '@testing-library/react'

import EmailPreviewBlock from '../EmailPreviewBlock'

test('renders markup decoded from an image src as link text', async () => {
  // The sanitizer leaves this src escaped; the preview's DOMParser decodes it
  const { container } = render(
    <EmailPreviewBlock
      body="body"
      themedBody={
        '<img src="cid:x&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">'
      }
    />
  )

  const link = await screen.findByRole('link')
  expect(link).toHaveTextContent('cid:x"><img src=x onerror=alert(1)>', {
    normalizeWhitespace: false,
  })
  expect(container.querySelector('img')).toBeNull()
})

test('replaces an external image with a placeholder linking to it', async () => {
  const src = 'https://example.com/image.png'
  render(
    <EmailPreviewBlock
      body="body"
      themedBody={`<p>Hello</p><img src="${src}" width="50">`}
    />
  )

  const link = await screen.findByRole('link', { name: src })
  expect(link).toHaveAttribute('href', src)
  expect(link).toHaveAttribute('target', '_blank')
  expect(
    screen.getByText('Preview not available for external link:')
  ).toBeInTheDocument()
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
