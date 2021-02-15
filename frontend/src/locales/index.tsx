import { i18n } from '@lingui/core'

/**
 * To create a new language or translation, for example, `en-custom`:
 * Add it to the `locales` array in `.linguirc` and run `npm run extract`
 */

import catalogEn from './en/messages.js'
const catalogs: Record<string, Record<string, string>> = {
  en: catalogEn.messages,
}
i18n.load(catalogs)
i18n.activate('en') // language to display for the site. Currently this is hard-coded and cannot be changed via UI.
