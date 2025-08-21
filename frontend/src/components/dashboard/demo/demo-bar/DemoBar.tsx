import cx from 'classnames'

import { useEffect, useState } from 'react'

import styles from './DemoBar.module.scss'

const DemoBar = ({
  isDisplayed,
}: {
  numDemosSms: number
  numDemosTelegram: number
  isDisplayed: boolean
}) => {
  const [isMenuVisible, setIsMenuVisible] = useState(isDisplayed)
  useEffect(() => {
    setIsMenuVisible(isDisplayed)
  }, [isDisplayed])

  return (
    <div className={styles.demoBar}>
      <div
        className={cx(styles.menuContainer, {
          [styles.show]: isMenuVisible,
        })}
      >
        <div className={styles.message}>
          <span className={styles.text}>
            We have stopped supporting Demo Campaigns as of 21 Aug 2025, please
            use postman.gov.sg to send out your SMSes
          </span>
        </div>
      </div>
    </div>
  )
}

export default DemoBar
