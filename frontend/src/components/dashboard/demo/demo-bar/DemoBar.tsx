import cx from 'classnames'

import { useContext, useEffect, useState } from 'react'

import CreateDemoModal from '../create-demo-modal'

import styles from './DemoBar.module.scss'

import { TextButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

const DemoBar = ({
  numDemosSms,
  numDemosTelegram,
  isDisplayed,
}: {
  numDemosSms: number
  numDemosTelegram: number
  isDisplayed: boolean
}) => {
  const modalContext = useContext(ModalContext)
  const [isMenuVisible, setIsMenuVisible] = useState(isDisplayed)
  const [hasDemo, setHasDemo] = useState(false)

  useEffect(() => {
    setHasDemo(!!numDemosTelegram || !!numDemosSms)
  }, [numDemosSms, numDemosTelegram])
  useEffect(() => {
    setIsMenuVisible(isDisplayed)
  }, [isDisplayed])

  function onCreate(): void {
    if (hasDemo) {
      modalContext.setModalContent(
        <CreateDemoModal
          numDemosSms={numDemosSms}
          numDemosTelegram={numDemosTelegram}
        />
      )
    }
  }

  function demoText() {
    return hasDemo
      ? `SMS: ${numDemosSms || 0}/3 left. Telegram:
    ${numDemosTelegram || 0}/3 left. `
      : `You have no demo campaigns left`
  }
  function demoLink() {
    return hasDemo ? (
      <TextButton className={styles.action} minButtonWidth onClick={onCreate}>
        Create a demo campaign now
      </TextButton>
    ) : (
      <></>
    )
  }

  return (
    <div className={styles.demoBar}>
      <div
        className={cx(styles.menuContainer, {
          [styles.show]: isMenuVisible,
        })}
      >
        <div className={styles.message}>
          <span className={styles.text}>
            <span className={styles.bold}>Demo Campaign: </span>
            {demoText()}
          </span>
          {demoLink()}
        </div>
      </div>
    </div>
  )
}

export default DemoBar
