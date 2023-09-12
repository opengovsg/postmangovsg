import cx from 'classnames'
import { RefObject } from 'react'

import styles from './Banner.module.scss'
export enum BannerColors {
  Primary = 'primary',
  Warning = 'warning',
  Danger = 'danger',
}

const Banner = (props: {
  innerRef?: RefObject<HTMLDivElement>
  bannerContent: string
  bannerColor: string
}) => {
  const { innerRef, bannerColor, bannerContent } = props

  let colorClassname = (bannerColor as BannerColors) || BannerColors.Primary
  if (!Object.values(BannerColors).includes(colorClassname)) {
    colorClassname = BannerColors.Primary
  }

  return (
    <div
      className={cx(styles.container, styles[colorClassname])}
      ref={innerRef}
    >
      <span className={styles.infoText}>{bannerContent}</span>
    </div>
  )
}

export default Banner
