import React from 'react'

import styles from './ProgressBar.module.scss'

const ProgressBar = ({ completed, total }: {completed: number; total: number}) => {

  const progressStyle = {
    width: `${Math.ceil(completed/total * 100)}%`,
  }

  return (
    <>
      <div className={styles.bar}>
        <div style={progressStyle} className={styles.completed}></div>
      </div>
    </>
  )
}

export default ProgressBar
