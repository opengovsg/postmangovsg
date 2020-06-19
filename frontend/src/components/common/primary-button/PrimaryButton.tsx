import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  const [asyncLoading, setAsyncLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const asyncOnClick = useMemo(
    () =>
      onClick
        ? async () => {
            setAsyncLoading(true)
            await Promise.resolve(onClick())
            // Only enable if button is still mounted
            if (isMounted.current) {
              setAsyncLoading(false)
            }
          }
        : undefined,
    [onClick]
  )

  return (
    <button
      className={cx(
        styles.button,
        { [styles.alignRight]: alignRight },
        className
      )}
      disabled={disabled || asyncLoading}
      onClick={asyncOnClick}
      {...otherProps}
    >
      {children}
    </button>
  )
}

export default PrimaryButton
