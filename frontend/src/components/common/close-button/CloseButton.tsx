import React from 'react'
import cx from 'classnames'

import styles from './CloseButton.module.scss'

const CloseButton = (props: any) => {
  const { className, ...otherProps } = props

  return (
    <div className={cx(styles.close, className)} {...otherProps}>
      +
    </div>
  )
}

export default CloseButton
