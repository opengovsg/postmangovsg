import cx from 'classnames'
import { forwardRef } from 'react'

import type { ReactNode, ChangeEvent } from 'react'

import styles from './TextInput.module.scss'

const TextInput = forwardRef((props: any, ref: ReactNode) => {
  const { onChange, className, badge, ...otherProps } = props

  return (
    <div className={cx(styles.textInput, className)}>
      <input
        ref={ref}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        {...otherProps}
      />
      {badge && (
        <div className={styles.badge}>
          <span>{badge}</span>
        </div>
      )}
    </div>
  )
})

TextInput.displayName = 'TextInput'

export default TextInput
