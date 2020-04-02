import React from 'react'
import styles from './ProgressPane.module.scss'

const ProgressItem = (props: any) => {
  const { content, active } = props.step
  const activeClass = active ? 'active' : ''
  return (
    <div className={[styles.progressItem, activeClass].join(' ')}>
      <div className={styles.number}>{props.number}</div>
      <div className={styles.title}>{content}</div>
    </div>
  )
}

const ProgressPane = (props: any) => {
  return (
    <div className={styles.progressPane}>
      {
        props.steps.map((step: string, index: number) =>
          <ProgressItem step={step} key={index} number={index + 1}></ProgressItem>
        )
      }
    </div>
  )
}

export default ProgressPane