import React from 'react'
import cx from 'classnames'
import styles from './TextInput.module.scss'

const TextInput = React.forwardRef((props: any, ref: React.ReactNode) => {
  const { transparent, onChange, className, ...otherProps } = props

  return (
    <input
      ref={ref}
      className={cx(styles.textInput, className, { [styles.transparentTextInput]: transparent })}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      {...otherProps} />
  )
})

export default TextInput