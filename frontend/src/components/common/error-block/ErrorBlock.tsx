import type { ReactNode } from 'react'
import cx from 'classnames'

import MessageBlock from '../message-block'

import styles from './ErrorBlock.module.scss'

const ErrorBlock = ({
  className,
  children,
  absolute,
  onClose,
  title,
  ...otherProps
}: {
  className?: string
  children?: ReactNode
  absolute?: boolean
  onClose?: () => void
  title?: string
}) => {
  return (
    <MessageBlock
      className={cx(styles.errorBlock, className)}
      icon="bx bx-x-circle"
      absolute={absolute}
      onClose={onClose}
      title={title}
      role="alert"
      {...otherProps}
    >
      {children}
    </MessageBlock>
  )
}

export default ErrorBlock
