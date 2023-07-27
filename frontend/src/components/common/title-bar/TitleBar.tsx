import type { ReactNode } from 'react'

import defaultStyles from './TitleBar.module.scss'

const TitleBar = ({
  children,
  title,
  overrideStyles,
}: {
  children?: ReactNode
  title: string
  overrideStyles?: { readonly [key: string]: string }
}) => {
  const styles = overrideStyles || defaultStyles
  return (
    <div className={styles.titleBar}>
      <h2 className={styles.titleText}>{title}</h2>
      {children}
    </div>
  )
}

export default TitleBar
