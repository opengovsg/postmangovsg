import styles from './ButtonGroup.module.scss'

import type { ReactNode } from 'react'

const ButtonGroup = ({ children }: { children: ReactNode }) => {
  return <div className={styles.buttonGroup}>{children}</div>
}

export default ButtonGroup
