import React from 'react'
import styles from './TitleBar.module.scss'

const TitleBar = ({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) => {
  return (
    <div className={styles.titleBar}>
      <h1 className={styles.titleText}>{title}</h1>
      {children}
    </div>
  )
}

export default TitleBar
