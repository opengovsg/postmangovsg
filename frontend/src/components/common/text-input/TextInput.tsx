import cx from 'classnames'
import { forwardRef } from 'react'

import type { ReactNode, ChangeEvent } from 'react'

import defaultStyles from './TextInput.module.scss'

const TextInput = forwardRef((props: any, ref: ReactNode) => {
  const {
    onChange,
    className,
    badge,
    iconLabel,
    overrideStyles,
    ...otherProps
  } = props
  const styles = overrideStyles || defaultStyles

  return (
    <div className={cx(styles.textInput, className)}>
      {iconLabel}
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
