import styles from './StepSection.module.scss'

import { ReactNode } from 'react'

const StepSection = ({
  children,
  separator = true,
}: {
  children: ReactNode
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
