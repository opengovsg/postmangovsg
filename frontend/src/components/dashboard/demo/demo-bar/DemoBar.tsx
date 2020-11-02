import React, { useCallback, useContext, useEffect, useState } from 'react'
import styles from './DemoBar.module.scss'
import cx from 'classnames'
import { CloseButton, TextButton } from 'components/common'
import { getUserSettings, updateDemoDisplayed } from 'services/settings.service'
import { ModalContext } from 'contexts/modal.context'
import CreateDemoModal from '../create-demo-modal'
const DemoBar = () => {
  const modalContext = useContext(ModalContext)
  const [isMenuVisible, setIsMenuVisible] = useState(false)
  const toggleMenu = useCallback(() => {
    updateDemoDisplayed(!isMenuVisible)
    setIsMenuVisible((state) => !state)
  }, [isMenuVisible])
  const [numDemosSms, setNumDemosSms] = useState(0)
  const [numDemosTelegram, setNumDemosTelegram] = useState(0)
  const [hasDemo, setHasDemo] = useState(false)

  useEffect(() => {
    async function getNumDemos() {
      // TRIAL: check for number of demos
      const { demo } = await getUserSettings()
      setIsMenuVisible(demo.isDisplayed)
      setNumDemosSms(demo?.numDemosSms)
      setNumDemosTelegram(demo?.numDemosTelegram)
    }
    getNumDemos()
  }, [])

  useEffect(() => {
    setHasDemo(!!numDemosTelegram || !!numDemosSms)
  }, [numDemosSms, numDemosTelegram])

  function onCreate(): void {
    if (hasDemo) {
      modalContext.setModalContent(
        <CreateDemoModal
          demoInfo={{ numDemosSms, numDemosTelegram }}
        ></CreateDemoModal>
      )
    }
  }

  return (
    <div className={styles.demoBar}>
      <button className={styles.demoButton} onClick={toggleMenu}>
        DEMO
      </button>
      <div
        className={cx(styles.menuContainer, {
          [styles.show]: isMenuVisible,
        })}
      >
        <div className={styles.message}>
          {hasDemo ? (
            <>
              <div className={styles.text}>
                SMS: {numDemosSms || 0}/3 left. Telegram:{' '}
                {numDemosTelegram || 0}/3 left.
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

export default DemoBar
