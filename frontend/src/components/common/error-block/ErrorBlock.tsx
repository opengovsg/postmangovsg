import React from 'react'
import cx from 'classnames'
import styles from './ErrorBlock.module.scss'
import MessageBlock from '../message-block'

const ErrorBlock = ({
  className,
  children,
  absolute,
  onClose,
  title,
  ...otherProps
}: {
  className?: string
  children?: React.ReactNode
  absolute?: boolean
  onClose?: Function
  title?: string
}) => {
  return (
    <MessageBlock
      className={cx(styles.errorBlock, className)}
      icon="bx bx-x-circle"
      absolute={absolute}
      onClose={onClose}
      title={title}
      {...otherProps}
    >
      {children}
    </MessageBlock>
  )
}

export default ErrorBlock
