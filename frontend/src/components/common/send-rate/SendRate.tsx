import React, { Dispatch, SetStateAction, useState } from 'react'
import cx from 'classnames'
import { GUIDE_POWER_USER_URL } from 'config'
import { TextInput } from 'components/common'
import styles from './SendRate.module.scss'

const SendRate = ({ sendRate, setSendRate }: { sendRate: string; setSendRate: Dispatch<SetStateAction<string>> }) => {

  const [useCustomRate, setUseCustomRate] = useState(false)

  return (
    <>
      <div className={styles.title} onClick={() => setUseCustomRate(!useCustomRate)}>
        <span><b>Send rate</b> <i>optional</i></span>
        <i className={cx(styles.icon, 'bx bxs-down-arrow', { [styles.rotateArrow]: useCustomRate })} />
      </div>

      {
        useCustomRate &&
        <>
          <p>You can send messages at a rapid rate, as long as the requests do not max out Twilio&apos;s
          REST API concurrency limit.&nbsp;
          <a
            href={GUIDE_POWER_USER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}>
              Learn more about send rate limits
          </a>
          </p>

          <p>Default rate is 10 messages/ second. If you have raised your send rate with Twilio previously,
          please enter your new send rate here. We will optimise our sending to match what Twilio has
            configured for your account.</p>

          <TextInput
            type="tel"
            value={sendRate}
            maxLength="3"
            className={styles.input}
            onChange={(str: string) => setSendRate(str.replace(/\D/g, ''))}
            placeholder='Enter send rate'
          />
        </>
      }
    </>
  )
}

export default SendRate
