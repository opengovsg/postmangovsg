import React, { useEffect, useState } from 'react'
import styles from './CompletedDemoModal.module.scss'
import CongratsImage from 'assets/img/demo/congrats.png'
import EndDemoImage from 'assets/img/demo/end-demo.png'
import { i18n } from 'locales'
import { LINKS } from 'config'
import { OutboundLink } from 'react-ga'
import { ChannelType } from 'classes'
import { getUserSettings } from 'services/settings.service'
import { PrimaryButton } from 'components/common'

const CompletedDemoModal = ({
  selectedChannel,
}: {
  selectedChannel: ChannelType
}) => {
  const [demoInfo, setDemoInfo] = useState({
    numDemosSms: 0,
    numDemosTelegram: 0,
  })
  useEffect(() => {
    async function getNumDemos() {
      // TRIAL: check for number of demos
      const { demo } = await getUserSettings()
      setDemoInfo(demo)
    }
    getNumDemos()
  }, [])

  function numDemosLeft() {
    switch (selectedChannel) {
      case ChannelType.SMS:
        return demoInfo.numDemosSms
      case ChannelType.Telegram:
        return demoInfo.numDemosTelegram
      default:
        return 0
    }
  }

  function renderRemainingDemos() {
    return (
      <>
        <div className={styles.modalImg}>
          <img src={CongratsImage} alt="Congrats Modal"></img>
        </div>
        <h2>
          Congrats, you’ve sent a demo {selectedChannel} campaign! You have{' '}
          {numDemosLeft()} remaining.
        </h2>
        <p>
          Thanks for trying Postman! Learn how to setup your own Twilio account
          or Telegram bot by following our guide. If you need further
          assistance, please contact us.
        </p>
      </>
    )
  }

  function renderNoDemos() {
    return (
      <>
        <div className={styles.modalImg}>
          <img src={EndDemoImage} alt="End Demo Modal"></img>
        </div>
        <h2>
          You’ve sent your last demo {selectedChannel} campaign. We hope you had
          a great experience!
        </h2>
        <p>
          Thanks for trying Postman! Learn how to setup your own Twilio account
          or Telegram bot by following our guide. If you need further
          assistance, please contact us.
        </p>
      </>
    )
  }

  return (
    <div className={styles.content}>
      {numDemosLeft() > 0 ? renderRemainingDemos() : renderNoDemos()}
      <div className={styles.options}>
        <OutboundLink
          eventLabel={i18n._(LINKS.guideDemoUrl)}
          to={i18n._(LINKS.guideDemoUrl)}
          target="_blank"
        >
          <PrimaryButton>Watch the video</PrimaryButton>
        </OutboundLink>
        <OutboundLink
          eventLabel={i18n._(LINKS.contactUsUrl)}
          to={i18n._(LINKS.contactUsUrl)}
          target="_blank"
        >
          <PrimaryButton className={styles.outlineBtn}>
            I need help
          </PrimaryButton>
        </OutboundLink>
      </div>
    </div>
  )
}

export default CompletedDemoModal
