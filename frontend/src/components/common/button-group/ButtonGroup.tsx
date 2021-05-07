import type { ReactNode } from 'react'

import styles from './ButtonGroup.module.scss'

const ButtonGroup = ({ children }: { children: ReactNode }) => {
  return <div className={styles.buttonGroup}>{children}</div>
}

export default ButtonGroup
