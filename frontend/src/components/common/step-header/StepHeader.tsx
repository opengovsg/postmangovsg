import React from 'react'

import styles from './StepHeader.module.scss'

const StepHeader = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) => {
  return (
    <div className={styles.stepHeader}>
      {subtitle && <sub>{subtitle}</sub>}
      <h2>{title}</h2>
      {children && <div className={styles.description}>{children}</div>}
    </div>
  )
}

export default StepHeader
