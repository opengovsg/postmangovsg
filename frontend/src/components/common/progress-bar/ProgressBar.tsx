import React from 'react'
import cx from 'classnames'

import styles from './ProgressBar.module.scss'

const ProgressBar = ({ progress, total, isComplete = false }: { progress: number; total: number; isComplete: boolean }) => {

  const progressStyle = {
    width: `${Math.ceil(progress / total * 100)}%`,
  }

  return (
    <>
      <div className={styles.bar}>
        <div style={progressStyle} className={cx(styles.progress, { [styles.complete]: isComplete })}></div>
      </div>
    </>
  )
}

export default ProgressBar
