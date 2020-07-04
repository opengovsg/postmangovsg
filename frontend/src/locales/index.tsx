import { setupI18n } from '@lingui/core'
import catalogEnCustom from './en-custom/messages.js'
import { Catalogs, I18n } from '@lingui/core/i18n'

const catalogs: Catalogs = { 'en-custom': catalogEnCustom }

export const i18n: I18n = setupI18n({
  language: 'en-custom', // language to display for the site. Currently this is hard-coded and cannot be changed via UI.
  catalogs,
})
