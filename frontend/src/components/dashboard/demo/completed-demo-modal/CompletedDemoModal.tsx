import { useContext, useEffect, useState } from 'react'
import { OutboundLink } from 'react-ga'
import { i18n } from '@lingui/core'
import CongratsImage from 'assets/img/demo/congrats.png'
import EndDemoImage from 'assets/img/demo/end-demo.png'
import { ChannelType } from 'classes'
import { PrimaryButton } from 'components/common'
import DemoVideoModal from 'components/dashboard/demo/demo-video-modal'
import { LINKS } from 'config'
import { ModalContext } from 'contexts/modal.context'
import { getUserSettings } from 'services/settings.service'

import styles from './CompletedDemoModal.module.scss'

const CompletedDemoModal = ({
  selectedChannel,
}: {
  selectedChannel: ChannelType
}) => {
  const { setModalContent } = useContext(ModalContext)
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
    void getNumDemos()
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
          Thanks for trying Postman! Learn how to setup your own Twilio or
          Telegram credentials by following our guide. If you need further
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
          Thanks for trying Postman! Learn how to setup your own Twilio or
          Telegram credentials by following our guide. If you need further
          assistance, please contact us.
        </p>
      </>
    )
  }

  function showDemoVideoModal() {
    setModalContent(
      <DemoVideoModal
        numDemosSms={demoInfo.numDemosSms}
        numDemosTelegram={demoInfo.numDemosTelegram}
      />
    )
  }

  return (
    <div className={styles.content}>
      {numDemosLeft() > 0 ? renderRemainingDemos() : renderNoDemos()}
      <div className={styles.options}>
        <PrimaryButton onClick={showDemoVideoModal}>
          Watch tutorial
        </PrimaryButton>

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
