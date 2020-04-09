import React from 'react'
import cx from 'classnames'

import styles from './PrimaryButton.module.scss'

const PrimaryButton = (props: any) => {
  const { className, children, ...otherProps } = props
  return (
    <button className={cx(styles.button, className)} {...otherProps}>
      {children}
    </button>
  )
}

export default PrimaryButton
