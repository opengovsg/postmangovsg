import cx from 'classnames'
import { forwardRef } from 'react'
import styles from './TextInput.module.scss'

import type { ReactNode, ChangeEvent } from 'react'

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
