import styles from './TitleBar.module.scss'

import type { ReactNode } from 'react'

const TitleBar = ({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) => {
  return (
    <div className={styles.titleBar}>
      <h2 className={styles.titleText}>{title}</h2>
      {children}
    </div>
  )
}

export default TitleBar
