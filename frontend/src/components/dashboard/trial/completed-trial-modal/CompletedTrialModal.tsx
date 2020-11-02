import React, { useEffect, useState } from 'react'
import styles from './CompletedTrialModal.module.scss'
import CongratsImage from 'assets/img/trial/congrats.png'
import EndDemoImage from 'assets/img/trial/end-demo.png'
import { i18n } from '@lingui/core'
import { LINKS } from 'config'
import { OutboundLink } from 'react-ga'
import { ChannelType } from 'classes'
import { getUserSettings } from 'services/settings.service'
const CompletedTrialModal = ({
  selectedChannel,
}: {
  selectedChannel: ChannelType
}) => {
  const [trialInfo, setTrialInfo] = useState({
    numTrialsSms: 0,
    numTrialsTelegram: 0,
  })

  useEffect(() => {
    async function getNumTrials() {
      // TRIAL: check for number of trials
      const { trial } = await getUserSettings()
      setTrialInfo(trial)
    }
    getNumTrials()
  }, [])

  function numTrialsLeft() {
    switch (selectedChannel) {
      case ChannelType.SMS:
        return trialInfo.numTrialsSms
      case ChannelType.Telegram:
        return trialInfo.numTrialsTelegram
      default:
        return 0
    }
  }

  function renderRemainingTrials() {
    return (
      <>
        <div className={styles.modalImg}>
          <img src={CongratsImage} alt="Congrats Modal"></img>
        </div>
        <h2>
          Congrats, you’ve sent a demo {selectedChannel} campaign! You have{' '}
          {numTrialsLeft()} remaining.
        </h2>
        <p>
          Thanks for trying Postman! Learn how to setup your own Twilio accoun
          or Telegram bot by following our guide. If you need further
          assistance, please contact us.
        </p>
      </>
    )
  }

  function renderNoTrials() {
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
      {numTrialsLeft() > 0 ? renderRemainingTrials() : renderNoTrials()}
      <div className="separator"></div>
      <div className={styles.options}>
        <OutboundLink
          eventLabel={i18n._(LINKS.guideDemoUrl)}
          to={i18n._(LINKS.guideDemoUrl)}
          target="_blank"
        >
          Learn more about demos
        </OutboundLink>
      </div>
    </div>
  )
}

export default CompletedTrialModal
