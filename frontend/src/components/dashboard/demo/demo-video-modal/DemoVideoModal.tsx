import { i18n } from '@lingui/core'

import { useContext } from 'react'

import ReactPlayer from 'react-player/lazy'

import styles from './DemoVideoModal.module.scss'

import { PrimaryButton, TextButton } from 'components/common'
import CreateDemoModal from 'components/dashboard/demo/create-demo-modal'
import { LINKS } from 'config'
import { ModalContext } from 'contexts/modal.context'

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
      <ReactPlayer
        playing
        controls
        url={i18n._(LINKS.demoVideoUrl)}
      ></ReactPlayer>
      <div className={styles.helpText}>
        Need more help?{' '}
        <a
          href={i18n._(LINKS.guideDemoUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the walkthrough tutorial
        </a>
        .
      </div>
      <div className={styles.options}>
        <TextButton className={styles.option} onClick={close}>
          Dismiss
        </TextButton>
        {!!numDemosSms || !!numDemosTelegram ? (
          <PrimaryButton
            className={styles.option}
            onClick={showCreateDemoModal}
          >
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
