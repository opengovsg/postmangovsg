import React from 'react'
import { i18n } from 'locales'
import { t } from '@lingui/macro'
import styles from './TrialInfoBanner.module.scss'
const TrialInfoBanner = () => {
  return (
    <div className={styles.infoBanner}>
      <b>{i18n._(t('trialMessageLabel')``)}: </b>
      {i18n._(t('trialMessage')``)}
    </div>
  )
}

export default TrialInfoBanner
