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
  const [numTrialsTelegram, setNumTrialsTelegram] = useState(0)
  const [hasTrial, setHasTrial] = useState(false)

  useEffect(() => {
    async function getNumTrials() {
      // TRIAL: check for number of trials
      const { trial } = await getUserSettings()
      setIsMenuVisible(!!trial?.numTrialsSms || !!trial?.numTrialsTelegram)
      setNumTrialsSms(trial?.numTrialsSms)
      setNumTrialsTelegram(trial?.numTrialsTelegram)
    }
    getNumTrials()
  }, [])

  useEffect(() => {
    setHasTrial(!!numTrialsTelegram || !!numTrialsSms)
  }, [numTrialsSms, numTrialsTelegram])

  function onCreate(): void {
    if (hasTrial) {
      modalContext.setModalContent(
        <CreateTrialModal
          trialInfo={{ numTrialsSms, numTrialsTelegram }}
        ></CreateTrialModal>
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
          {hasTrial ? (
            <>
              <div className={styles.text}>
                SMS: {numTrialsSms || 0}/3 left. Telegram:{' '}
                {numTrialsTelegram || 0}/3 left.
              </div>
              <TextButton
                className={styles.action}
                minButtonWidth
                onClick={onCreate}
              >
                Create a demo campaign now
              </TextButton>
            </>
          ) : (
            <div className={styles.text}>You have no demo campaigns left.</div>
          )}
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
