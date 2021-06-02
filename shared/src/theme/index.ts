import mustache from 'mustache'
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
  return mustache.render(htmlTemplate, emailThemeFields)
}

export {
  generateThemedHTMLEmail
}