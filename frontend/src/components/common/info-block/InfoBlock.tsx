import React from 'react'
import cx from 'classnames'
import styles from './InfoBlock.module.scss'
import MessageBlock from '../message-block'

const InfoBlock = ({
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
