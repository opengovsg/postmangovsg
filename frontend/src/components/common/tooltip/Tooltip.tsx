import type { ReactNode } from 'react'
import cx from 'classnames'

import styles from './Tooltip.module.scss'

const Tooltip = ({
  containerClassName,
  tooltipClassName,
  children,
  text,
}: {
  containerClassName?: string
  tooltipClassName?: string
  children: ReactNode
  text: string
}) => {
  return (
    <span className={cx(styles.tooltipContainer, containerClassName)}>
      <span className={cx(styles.tooltip, tooltipClassName)}>{text}</span>
      {children}
    </span>
  )
}

export default Tooltip
