import type { ReactNode } from 'react'
import cx from 'classnames'
import { CloseButton } from 'components/common'

import styles from './MessageBlock.module.scss'

const MessageBlock = ({
  className,
  icon,
  title,
  children,
  absolute,
  onClose,
  ...otherProps
}: {
  className?: string
  title?: string
  icon?: string
  children?: ReactNode
  absolute?: boolean
  onClose?: () => void
  role?: string
}) => {
  if (!children) {
    return null
  }

  return (
    <div className={styles.relativeContainer}>
      <div
        className={cx(
          styles.content,
          { [styles.absolute]: absolute, [styles.withClose]: onClose },
          className
        )}
        {...otherProps}
      >
        <li>
          {icon && <i className={icon}></i>}
          <div>
            {title && <h4>{title}</h4>}
            {children}
          </div>
        </li>

        {onClose && (
          <CloseButton
            onClick={onClose}
            className={styles.close}
            title="Close message"
          />
        )}
      </div>
    </div>
  )
}

export default MessageBlock
