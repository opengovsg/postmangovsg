import cx from 'classnames'
import styles from './WarningBlock.module.scss'
import MessageBlock from '../message-block'

import type { ReactNode } from 'react'

const WarningBlock = ({
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
