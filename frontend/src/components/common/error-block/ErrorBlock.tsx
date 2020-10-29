import React from 'react'
import cx from 'classnames'

import { CloseButton } from 'components/common'

import styles from './ErrorBlock.module.scss'

const ErrorBlock = ({
  className,
  children,
  absolute,
  onClose,
  ...otherProps
}: {
  className?: string
  children?: React.ReactNode
  absolute?: boolean
  onClose?: Function
}) => {
  if (!children) {
    return null
  }

  return (
    <div className={styles.relativeContainer}>
      <div
        className={cx(
          styles.errorBlock,
          { [styles.absolute]: absolute, [styles.withClose]: onClose },
          className
        )}
        {...otherProps}
      >
        <li>
          <i className="bx bx-x-circle"></i>
          <p>{children}</p>
        </li>
        {onClose && <CloseButton onClick={onClose} className={styles.close} />}
      </div>
    </div>
  )
}

export default ErrorBlock
