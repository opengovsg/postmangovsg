import React from 'react'
import cx from 'classnames'

import styles from './PrimaryButton.module.scss'

const PrimaryButton = (props: any) => {
  const { className, children, alignRight, ...otherProps } = props
  return (
    <button className={cx(styles.button, { [styles.alignRight]: alignRight }, className)} {...otherProps}>
      {children}
    </button >
  )
}

export default PrimaryButton
