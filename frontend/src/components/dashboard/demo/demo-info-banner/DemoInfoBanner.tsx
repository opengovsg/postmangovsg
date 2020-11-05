import React from 'react'
import { i18n } from 'locales'
import { t } from '@lingui/macro'
import styles from './DemoInfoBanner.module.scss'
const DemoInfoBanner = () => {
  return (
    <div className={styles.infoBanner}>
      <b>{i18n._(t('demoMessageLabel')``)}: </b>
      {i18n._(t('demoMessage')``)}
    </div>
  )
}

export default DemoInfoBanner
