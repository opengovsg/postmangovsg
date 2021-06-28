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

describe('generateThemedHTMLEmail', () => {
  it('should embed text in body field into <body> tag', async () => {
    const htmlEmail = await ThemeClient.generateThemedHTMLEmail({
      body: '<p>Test</p>',
      unsubLink: '',
    })

    /**
     * Regex to match contents of <body> tag
     * @see: https://stackoverflow.com/a/2857261
     */
    const bodyContent = /<body.*?>([\s\S]*)<\/body>/.exec(htmlEmail)?.[1]
    expect(bodyContent).not.toBeUndefined()
    expect(bodyContent).toContain('<p>Test</p>')
  })
})

describe('generateThemedBody', () => {
  it('should return the <body> content from the return value of generateThemedHTMLEmail', async () => {
    jest.spyOn(ThemeClient, 'generateThemedHTMLEmail').mockResolvedValue(`
      <html>
        <head>
          <title>Page Title</title>
        </head>
        <body>
          <p>Body Content</p>
        </body>
      </html>
    `)

    const themedBody = await ThemeClient.generateThemedBody({} as any)
    const trimmedBody = themedBody.trim() // remove whitespace before comparing values
    expect(trimmedBody).toEqual('<p>Body Content</p>')

    jest.resetAllMocks()
  })
})
