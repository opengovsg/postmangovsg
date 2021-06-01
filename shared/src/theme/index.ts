import mustache from 'mustache'
import fs from 'fs'
import path from 'path'

interface EmailThemeFields {
  body: string
  agencyName?: string
  agencyLogoURI?: string
  unsubLink: string
}

const generateThemedHTMLEmail = (emailThemeFields: EmailThemeFields): string => {
  const htmlTemplate = fs.readFileSync(path.resolve(__dirname, './email-theme.mustache'), 'utf-8')
  return mustache.render(htmlTemplate, emailThemeFields)
}

export {
  generateThemedHTMLEmail
}