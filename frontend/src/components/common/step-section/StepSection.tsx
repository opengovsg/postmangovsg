import * as React from 'react'

import styles from './StepSection.module.scss'

const StepSection = ({
  children,
  separator = true,
}: {
  children: React.ReactNode
  separator?: boolean
}) => {
  return (
    <>
      <div className={styles.stepSection}>{children}</div>
      {separator && <div className="separator"></div>}
    </>
  )
}

export default StepSection
