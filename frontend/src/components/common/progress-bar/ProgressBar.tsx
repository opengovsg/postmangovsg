import React from 'react'

import styles from './ProgressBar.module.scss'

const ProgressBar = ({ progress, total }: {progress: number; total: number}) => {

  const progressStyle = {
    width: `${Math.ceil(progress/total * 100)}%`,
  }

  return (
    <>
      <div className={styles.bar}>
        <div style={progressStyle} className={styles.progress}></div>
      </div>
    </>
  )
}

export default ProgressBar
