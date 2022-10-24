import { i18n } from '@lingui/core'
import { en } from 'make-plural/plurals'

/**
 * To create a new language or translation, for example, `en-custom`:
 * Add it to the `locales` array in `.linguirc` and run `npm run extract`
 */
import catalogEn from './en/messages.js'

i18n.loadLocaleData('en', { plurals: en })
i18n.load('en', catalogEn.messages)
i18n.activate('en') // language to display for the site. Currently this is hard-coded and cannot be changed via UI.
