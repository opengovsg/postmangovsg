import mustache from 'mustache'
import { filterXSS } from 'xss'
import fs from 'fs'
import path from 'path'

type EmailThemeFields = {
  body: string
  agencyName?: string
  agencyLogoURI?: string
  unsubLink: string
  showMasthead?: boolean
  contactPrefLink?: string
}

export class ThemeClient {
  private static emailHTMLTemplate: string

  private static async loadEmailHTMLTemplate(): Promise<void> {
    if (this.emailHTMLTemplate === undefined) {
      this.emailHTMLTemplate = await fs.promises.readFile(
        path.resolve(__dirname, './email-theme.mustache'),
        'utf-8'
      )
    }
  }

  /**
   * Take first 200 characters of the body (with html tags stripped) to use as
   * preheader (preview text of email content)
   * @param body - HTML body content of email
   * @returns first 200 characters after stripping html tags
   */
  static generatePreheader(body: string): string {
    return filterXSS(body, {
      whiteList: {},
      stripIgnoreTagBody: ['script'],
      onIgnoreTag: (_tag, _html, options) => {
        // Append whitespace after each closing tag
        if (options.isClosing) return ' '
        else return ''
      },
    }).substring(0, 200)
  }

  static async generateThemedHTMLEmail(
    emailThemeFields: EmailThemeFields
  ): Promise<string> {
    await this.loadEmailHTMLTemplate()

    const preheader = this.generatePreheader(emailThemeFields.body)

    return mustache.render(this.emailHTMLTemplate, {
      ...emailThemeFields,
      preheader,
    })
  }

  // Returns contents of <body> tag from generateThemedHTMLEmail
  static async generateThemedBody(
    emailThemeFields: EmailThemeFields
  ): Promise<string> {
    const themedHTMLEmail = await this.generateThemedHTMLEmail(emailThemeFields)

    /**
     * Regex to match contents of <body> tag
     * @see: https://stackoverflow.com/a/2857261
     */
    const themedBody = /<body.*?>([\s\S]*)<\/body>/.exec(themedHTMLEmail)?.[1]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return themedBody!
  }
}
