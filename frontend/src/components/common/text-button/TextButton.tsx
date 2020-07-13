import React from 'react'
import cx from 'classnames'

import styles from './TextButton.module.scss'

const TextButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { className, ...otherProps } = props
  return (
    <button
      className={cx(styles.textButton, className)}
      {...otherProps}
    ></button>
  )
}

export default TextButton
