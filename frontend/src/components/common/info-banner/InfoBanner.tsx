import React from 'react'

import styles from './InfoBanner.module.scss'

const InfoBanner = (props: any) => {
  const { children } = props
  if (!children) {
    return null
  }

  return (
    <div className={styles.container}>
      <span className={styles.infoText}>{children}</span>
    </div>
  )
}

export default InfoBanner
