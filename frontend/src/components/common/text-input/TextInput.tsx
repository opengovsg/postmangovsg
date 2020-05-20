import React from 'react'
import cx from 'classnames'
import styles from './TextInput.module.scss'

const TextInput = React.forwardRef((props: any, ref: React.ReactNode) => {
  const { onChange, className, ...otherProps } = props

  return (
    <input
      ref={ref}
      className={cx(styles.textInput, className)}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      {...otherProps} />
  )
})

export default TextInput