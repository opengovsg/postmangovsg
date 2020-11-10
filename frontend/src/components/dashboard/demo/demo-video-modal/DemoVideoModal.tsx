import React, { useContext } from 'react'
import { ModalContext } from 'contexts/modal.context'
import styles from './DemoVideoModal.module.scss'
import { PrimaryButton, TextButton } from 'components/common'
import CreateDemoModal from 'components/dashboard/demo/create-demo-modal'
import { LINKS } from 'config'
import { i18n } from 'locales'
import { OutboundLink } from 'react-ga'

const DemoVideoModal = ({
  numDemosSms,
  numDemosTelegram,
}: {
  numDemosSms: number
  numDemosTelegram: number
}) => {
  const { close, setModalContent } = useContext(ModalContext)

  function showCreateDemoModal() {
    setModalContent(
      <CreateDemoModal
        numDemosSms={numDemosSms}
        numDemosTelegram={numDemosTelegram}
      />
    )
  }
  return (
    <div className={styles.content}>
      <h2 className={styles.title}>Send Demo SMS or Telegram Campaigns</h2>
      <p className={styles.helpText}>
        Need more help?{' '}
        <OutboundLink
          eventLabel={i18n._(LINKS.guideDemoUrl)}
          to={i18n._(LINKS.guideDemoUrl)}
          target="_blank"
        >
          Read the guide
        </OutboundLink>
        .
      </p>
      <div className={styles.options}>
        <TextButton minButtonWidth onClick={close}>
          Dismiss
        </TextButton>
        {!!numDemosSms || !!numDemosTelegram ? (
          <PrimaryButton onClick={showCreateDemoModal}>
            Got it, I&apos;m ready to try
          </PrimaryButton>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}

export default DemoVideoModal
