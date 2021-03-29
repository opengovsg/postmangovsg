import React from 'react'

import styles from './StepHeader.module.scss'

const StepHeader = ({
  title,
  subtitle,
  children,
}: {
  title: string | React.ReactNode
  subtitle?: string
  children?: React.ReactNode
}) => {
  return (
    <div className={styles.stepHeader}>
      {subtitle && <sub>{subtitle}</sub>}
      <div className={styles.title}>
        {React.isValidElement(title) ? title : <h3>{title}</h3>}
      </div>
      {children && <div className={styles.description}>{children}</div>}
    </div>
  )
}

export default StepHeader
