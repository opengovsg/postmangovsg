import React from 'react'
import cx from 'classnames'
import styles from './TextInput.module.scss'

const TextInput = (props: any) => {
  const { className, ...otherProps } = props

  return (
    <input className={cx(styles.textInput, className)} {...otherProps} />
  )
}

export default TextInput