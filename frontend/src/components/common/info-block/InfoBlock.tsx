import cx from 'classnames'
import styles from './InfoBlock.module.scss'
import MessageBlock from '../message-block'

import type { ReactNode } from 'react'

const InfoBlock = ({
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
      className={cx(styles.infoBlock, className)}
      icon="bx bx-info-circle"
      absolute={absolute}
      onClose={onClose}
      title={title}
      {...otherProps}
    >
      {children}
    </MessageBlock>
  )
}

export default InfoBlock
