import React, { useCallback, useContext, useEffect, useState } from 'react'
import styles from './TrialBar.module.scss'
import cx from 'classnames'
import { CloseButton, TextButton } from 'components/common'
import { getUserSettings } from 'services/settings.service'
import { ModalContext } from 'contexts/modal.context'
import CreateTrialModal from '../create-trial-modal'
const TrialBar = ({ isVisible: initialIsVisible }: { isVisible: boolean }) => {
  const modalContext = useContext(ModalContext)
  const [isMenuVisible, setIsMenuVisible] = useState(initialIsVisible)
  const toggleMenu = useCallback(() => setIsMenuVisible((state) => !state), [])
  const [numTrialsSms, setNumTrialsSms] = useState(0)

  useEffect(() => {
    async function getNumTrials() {
      // TRIAL: check for number of trials
      const { trial } = await getUserSettings()
      setIsMenuVisible(!!trial.numTrialsSms)
      setNumTrialsSms(trial.numTrialsSms)
    }
    getNumTrials()
  }, [])

  function onCreate(): void {
    if (numTrialsSms) {
      modalContext.setModalContent(
        <CreateTrialModal trialInfo={{ numTrialsSms }}></CreateTrialModal>
      )
    }
  }

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
          <div className={styles.text}>SMS: {numTrialsSms}/3 left.</div>
          <TextButton
            className={styles.action}
            minButtonWidth
            onClick={onCreate}
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
