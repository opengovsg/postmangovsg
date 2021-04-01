import * as React from 'react'
import cx from 'classnames'
import styles from './WarningBlock.module.scss'
import MessageBlock from '../message-block'

const WarningBlock = ({
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
  onClose?: () => void
  title?: string
}) => {
  return (
    <MessageBlock
      className={cx(styles.warningBlock, className)}
      icon="bx bx-error-circle"
      absolute={absolute}
      onClose={onClose}
      title={title}
      {...otherProps}
    >
      {children}
    </MessageBlock>
  )
}

export default WarningBlock
