import React, { Dispatch, SetStateAction, useState } from 'react'
import { OutboundLink } from 'react-ga'
import cx from 'classnames'
import { LINKS } from 'config'
import { TextInput } from 'components/common'
import styles from './SendRate.module.scss'
import { ChannelType } from 'classes'
import { i18n } from 'locales'

const SendRate = ({
  sendRate,
  setSendRate,
  channelType,
}: {
  sendRate: string
  setSendRate: Dispatch<SetStateAction<string>>
  channelType: ChannelType
}) => {
  const [useCustomRate, setUseCustomRate] = useState(false)

  function renderInfo() {
    switch (channelType) {
      case ChannelType.SMS:
        return (
          <>
            <p>
              You can send messages at a rapid rate, as long as the requests do
              not max out Twilio&apos;s REST API concurrency limit.&nbsp;
              <OutboundLink
                className={styles.link}
                eventLabel={i18n._(LINKS.guidePowerUserUrl)}
                to={i18n._(LINKS.guidePowerUserUrl)}
                target="_blank"
              >
                Learn more about send rate limits
              </OutboundLink>
            </p>

            <p>
              Default rate is 10 messages/ second. If you have raised your send
              rate with Twilio previously, please enter your new send rate here.
              We will optimise our sending to match what Twilio has configured
              for your account.
            </p>
          </>
        )
      case ChannelType.Telegram:
        return (
          <p>
            Default rate is 30 messages/ second. This is the maximum send rate
            supported by Telegram.
          </p>
        )
      default:
        return <div>Unsupported channel type</div>
    }
  }

  return (
    <>
      <div
        className={styles.title}
        onClick={() => setUseCustomRate(!useCustomRate)}
      >
        <span>
          <b>Send rate</b> <i>optional</i>
        </span>
        <i
          className={cx(styles.icon, 'bx bxs-down-arrow', {
            [styles.rotateArrow]: useCustomRate,
          })}
        />
      </div>

      {useCustomRate && (
        <>
          {renderInfo()}

          <TextInput
            type="tel"
            value={sendRate}
            maxLength="3"
            className={styles.input}
            onChange={(str: string) => setSendRate(str.replace(/\D/g, ''))}
            placeholder="Enter send rate"
          />
        </>
      )}
    </>
  )
}

export default SendRate
