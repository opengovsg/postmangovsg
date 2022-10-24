import { RefObject } from 'react'
import cx from 'classnames'
import { INFO_BANNER, INFO_BANNER_COLOR } from 'config'

import styles from './InfoBanner.module.scss'

export enum BannerColors {
  Primary = 'primary',
  Warning = 'warning',
  Danger = 'danger',
}

const InfoBanner = (props: { innerRef?: RefObject<HTMLDivElement> }) => {
  const { innerRef } = props
  if (!INFO_BANNER) {
    return null
  }

  let colorClassname =
    (INFO_BANNER_COLOR as BannerColors) || BannerColors.Primary
  if (!Object.values(BannerColors).includes(colorClassname)) {
    colorClassname = BannerColors.Primary
  }

  return (
    <div
      className={cx(styles.container, styles[colorClassname])}
      ref={innerRef}
    >
      <span className={styles.infoText}>{INFO_BANNER}</span>
    </div>
  )
}

export default InfoBanner
