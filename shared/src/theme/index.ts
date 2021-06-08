import mustache from 'mustache'
import xss from 'xss'
import fs from 'fs'
import path from 'path'

const generateThemedHTMLEmail = async (emailThemeFields: {
  body: string
  agencyName?: string
  agencyLogoURI?: string
  unsubLink: string
}): Promise<string> => {
  const htmlTemplate = await fs.promises.readFile(
    path.resolve(__dirname, './email-theme.mustache'),
    'utf-8'
  )

  // Take first 200 characters of the body (without html tags) to use as preheader (preview text of email content)
  // Append whitespace after closing tags so paragraphs are spaced out in preheader
  const { body } = emailThemeFields
  const preheader = xss
    .filterXSS(body, {
      whiteList: {},                  // whitelist for tags is empty, i.e. strip all HTML tags 
      stripIgnoreTagBody: ['script'], // remove contents of script tags entirely
      onIgnoreTag: (_tag, _html, options) => {
        // @ts-ignore types are missing, upgrade to js-xss 1.0.9 which fixes missing types
        if(options.isClosing) return ' '
        else return ''
      }
    })
    .substring(0,200)

  return mustache.render(htmlTemplate, {
    ...emailThemeFields,
    preheader,
  })
}

export {
  generateThemedHTMLEmail
}