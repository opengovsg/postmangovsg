import * as React from 'react'

import styles from './ButtonGroup.module.scss'

const ButtonGroup = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.buttonGroup}>{children}</div>
}

export default ButtonGroup
