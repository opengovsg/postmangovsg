import cx from 'classnames'

import { useState, useMemo } from 'react'

import type {
  ButtonHTMLAttributes,
  ReactElement,
  FunctionComponent,
} from 'react'

import styles from './PrimaryButton.module.scss'

import useIsMounted from 'components/custom-hooks/use-is-mounted'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  alignRight?: boolean
  onClick?: (...args: any[]) => void | Promise<void>
  loadingPlaceholder?: string | ReactElement
  type?: 'button' | 'submit' | 'reset'
}

const PrimaryButton: FunctionComponent<PrimaryButtonProps> = ({
  alignRight,
  className,
  disabled,
  onClick,
  children,
  loadingPlaceholder,
  type,
  ...otherProps
}) => {
  const [asyncLoading, setAsyncLoading] = useState(false)
  const isMounted = useIsMounted()

  const asyncOnClick = useMemo(
    () =>
      onClick
        ? async () => {
            setAsyncLoading(true)
            try {
              await onClick()
            } finally {
              // Only enable if button is still mounted
              if (isMounted.current) {
                setAsyncLoading(false)
              }
            }
          }
        : undefined,
    [isMounted, onClick]
  )

  return (
    <button
      type={type || 'button'}
      className={cx(
        styles.button,
        { [styles.alignRight]: alignRight },
        className
      )}
      disabled={disabled || asyncLoading}
      onClick={asyncOnClick}
      {...otherProps}
    >
      {loadingPlaceholder && asyncLoading ? loadingPlaceholder : children}
    </button>
  )
}

export default PrimaryButton
