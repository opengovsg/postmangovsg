import React from 'react'
import styles from './TitleBar.module.scss'

const TitleBar = (props: any) => {
  return (
    <div className={styles.titlebar}>
      <span>{props.title}</span>
    </div>
  )
}

export default TitleBar