import { ThemeClient } from '../../theme'

describe('generatePreheader', () => {
  it('should strip all html tags (keeping their content) and append a space after each tag', () => {
    const body =
      '<p>This is paragraph 1</p><h1>This is header 1</h1><p>This is paragraph 2</p>'
    const preheader = ThemeClient.generatePreheader(body)
    expect(preheader).toEqual(
      'This is paragraph 1 This is header 1 This is paragraph 2 '
    )
  })

  it('should remove <script> tags and all its contents without appending space', () => {
    const body =
      "This is some body text.<script>alert('Hello');</script>This is more body text."
    const preheader = ThemeClient.generatePreheader(body)
    expect(preheader).toEqual('This is some body text.This is more body text.')
  })

  it('should return only the first 200 characters after stripping html tags', () => {
    const body = '<p>This is some random text</p>'.repeat(30)
    const preheader = ThemeClient.generatePreheader(body)
    expect(preheader).toEqual(
      'This is some random text '.repeat(30).substring(0, 200)
    )
  })
})
