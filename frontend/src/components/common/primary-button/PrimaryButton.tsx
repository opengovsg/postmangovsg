import React, { useState, useRef, useEffect } from 'react'
import cx from 'classnames'

import styles from './PrimaryButton.module.scss'

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  alignRight?: boolean
  onClick?: (...args: any[]) => void | Promise<void>
}

const PrimaryButton: React.FunctionComponent<PrimaryButtonProps> = ({
  alignRight,
  className,
  disabled,
  onClick,
  children,
  ...otherProps
}) => {
  const [asyncDisabled, setAsyncDisabled] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const asyncOnClick = onClick
    ? async () => {
        setAsyncDisabled(true)
        await Promise.resolve(onClick())
        // Only enable if button is still mounted
        if (isMounted.current) {
          setAsyncDisabled(false)
        }
      }
    : undefined

  return (
    <button
      className={cx(
        styles.button,
        { [styles.alignRight]: alignRight },
        className
      )}
      disabled={disabled || asyncDisabled}
      onClick={asyncOnClick}
      {...otherProps}
    >
      {children}
    </button>
  )
}

export default PrimaryButton
