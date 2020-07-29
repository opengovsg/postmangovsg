import { setupI18n } from '@lingui/core'
import { Catalogs, I18n } from '@lingui/core/i18n'

/**
 * To create a new language or translation, for example, `en-custom`:
 * `npm run add-locale en-custom`
 * then import it here
 *  */

import catalogEn from './en/messages.js'
const catalogs: Catalogs = { en: catalogEn }
export const i18n: I18n = setupI18n({
  language: 'en', // language to display for the site. Currently this is hard-coded and cannot be changed via UI.
  catalogs,
})
