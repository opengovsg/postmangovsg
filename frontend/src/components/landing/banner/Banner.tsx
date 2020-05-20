import React from 'react'
import cx from 'classnames'

import styles from './Banner.module.scss'

const Banner = () => {

  return (
    <div className={styles.container}>
      <a href="https://www.gov.sg" target="_blank">
        <span className={cx(styles.sgdsIcon, styles.sgCrestIcon)}></span>
        <span className={styles.bannerText}>A Singapore Government Agency Website</span>
      </a>
    </div >
  )
}

export default Banner
