import React from 'react'
import cx from 'classnames'
import styles from './TextInput.module.scss'

const TextInput = (props: any) => {
  const { onChange, className, ...otherProps } = props

  return (
    <input
      className={cx(styles.textInput, className)}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      {...otherProps} />
  )
}

export default TextInput