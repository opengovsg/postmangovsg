import cx from 'classnames'
import { forwardRef } from 'react'

import type { ReactNode, ChangeEvent } from 'react'

import styles from './TextInput.module.scss'

const TextInput = forwardRef((props: any, ref: ReactNode) => {
  const { onChange, className, ...otherProps } = props

  return (
    <input
      ref={ref}
      className={cx(styles.textInput, className)}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      {...otherProps}
    />
  )
})

TextInput.displayName = 'TextInput'

export default TextInput
