import cx from 'classnames'
import { ForwardedRef, forwardRef } from 'react'

import type { ChangeEvent } from 'react'

import defaultStyles from './TextInput.module.scss'

const TextInput = forwardRef(
  (props: any, ref: ForwardedRef<HTMLInputElement | undefined>) => {
    const {
      onChange,
      className,
      badge,
      iconLabel,
      overrideStyles,
      disabled,
      ...otherProps
    } = props
    const styles = overrideStyles || defaultStyles

    return (
      <div
        className={cx(
          styles.textInput,
          className,
          disabled ? styles.textInputDisabled : ''
        )}
      >
        {iconLabel}
        <input
          ref={ref}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          disabled={disabled}
          {...otherProps}
        />
        {badge && (
          <div className={styles.badge}>
            <span>{badge}</span>
          </div>
        )}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export default TextInput
