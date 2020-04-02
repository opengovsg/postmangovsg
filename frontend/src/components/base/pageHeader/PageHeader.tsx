import React from 'react'
import styles from './PageHeader.module.scss'

const PageHeader = (props: any) => {
  return (
    <div className={styles.pageHeader}>
      <span>{props.title}</span>
    </div>
  )
}

export default PageHeader