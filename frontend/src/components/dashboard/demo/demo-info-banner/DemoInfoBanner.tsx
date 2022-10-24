import { t } from '@lingui/macro'

import styles from './DemoInfoBanner.module.scss'

const DemoInfoBanner = () => {
  return (
    <div className={styles.infoBanner}>
      <b>{t`demoMessageLabel`}: </b>
      {t`demoMessage`}
    </div>
  )
}

export default DemoInfoBanner
