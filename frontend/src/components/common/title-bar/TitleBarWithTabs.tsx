import type { ReactNode } from 'react'

import defaultStyles from './TitleBar.module.scss'

const HStackStyle = {
  display: 'flex',
  alignItems: 'center',
}

const subsequentElementStyle = { marginLeft: '4vw' }

export const TitleBarWithTabs = ({
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
      {!!children && Array.isArray(children) && children.length === 2 && (
        <>
          <div style={HStackStyle}>
            <h2 className={styles.titleText}>{title}</h2>
            <div style={subsequentElementStyle}>{children[0]}</div>
          </div>
          {children.slice(1)}
        </>
      )}
    </div>
  )
}
