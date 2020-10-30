import React, { useCallback, useState } from 'react'
import styles from './TrialBar.module.scss'
import cx from 'classnames'
import { CloseButton, TextButton } from 'components/common'
const TrialBar = ({ isVisible: initialIsVisible }: { isVisible: boolean }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(initialIsVisible)
  const toggleMenu = useCallback(() => setIsMenuVisible((state) => !state), [])
  return (
    <div className={styles.trialBar}>
      <button className={styles.trialButton} onClick={toggleMenu}>
        DEMO
      </button>
      <div
        className={cx(styles.menuContainer, {
          [styles.show]: isMenuVisible,
        })}
      >
        <div className={styles.message}>
          <div className={styles.text}>SMS: 2/3 left. Telegram: 3/3 left.</div>
          <TextButton
            className={styles.action}
            minButtonWidth
            onClick={toggleMenu}
          >
            Create a demo campaign now
          </TextButton>
        </div>

        <CloseButton
          onClick={toggleMenu}
          className={styles.closeButton}
        ></CloseButton>
      </div>
    </div>
  )
}

export default TrialBar
