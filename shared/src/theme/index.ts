import mustache from 'mustache'
import xss from 'xss'
import fs from 'fs'
import path from 'path'

type EmailThemeFields = {
  body: string
  agencyName?: string
  agencyLogoURI?: string
  unsubLink: string
  showMasthead?: boolean
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
   * @param body - HTML body of email
   * @returns first 200 characters after stripping html tags
   */
  static generatePreheader(body: string): string {
    return xss
      .filterXSS(body, {
        whiteList: {},
        stripIgnoreTagBody: ['script'],
        onIgnoreTag: (_tag, _html, options) => {
          // Append whitespace after each closing tag
          // @ts-ignore types are missing, upgrade to js-xss 1.0.9 which fixes missing types
          if (options.isClosing) return ' '
          else return ''
        }
      })
      .substring(0, 200)
  }

  static async generateThemedHTMLEmail (emailThemeFields: EmailThemeFields): Promise<string> {
    await this.loadEmailHTMLTemplate()

    const preheader = this.generatePreheader(emailThemeFields.body)

    return mustache.render(this.emailHTMLTemplate, {
      ...emailThemeFields,
      preheader,
    })
  }

  // Returns contents of <body> tag from generateThemedHTMLEmail
  static async generateThemedBody (emailThemeFields: EmailThemeFields) {
    const themedHTMLEmail = await this.generateThemedHTMLEmail(emailThemeFields)

    /**
     * Regex to match contents of <body> tag
     * @see: https://stackoverflow.com/a/2857261
     */
    const themedBody = /<body.*?>([\s\S]*)<\/body>/.exec(themedHTMLEmail)?.[1]
    return themedBody
  }
}