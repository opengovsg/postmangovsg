import { useContext, useEffect, useState } from 'react'
import { i18n } from '@lingui/core'
import { ErrorBlock } from 'components/common'
import { ANNOUNCEMENT, getAnnouncementVersion } from 'config'
import { ModalContext } from 'contexts/modal.context'
import { updateAnnouncementVersion } from 'services/settings.service'

import styles from './AnnouncementModal.module.scss'
import GraphicAnnouncementModal from './GraphicAnnouncementModal'
import VideoAnnouncementModal from './VideoAnnouncementModal'

export type AnnouncementModalProps = {
  title: string
  primaryButtonUrl: string
  primaryButtonText: string
  handleReadMoreClicked: () => Promise<void>

  // Optional parameters
  mediaUrl?: string
  subtext?: string
  secondaryButtonUrl?: string
  secondaryButtonText?: string
}

type AnnouncementContent = Omit<AnnouncementModalProps, 'handleReadMoreClicked'>

function getAnnouncementContent(): AnnouncementContent {
  // In lingui, we can't simply leave a translation empty as it will be replaced
  // by a default value during compilation.
  // Instead, mark it as "null" to indicate that it is empty.
  const EMPTY_TRANSLATION = 'null'
  const KEYS: Array<keyof AnnouncementContent> = [
    'title',
    'subtext',
    'mediaUrl',
    'primaryButtonUrl',
    'primaryButtonText',
    'secondaryButtonUrl',
    'secondaryButtonText',
  ]
  const content: Partial<AnnouncementContent> = {}
  for (const key of KEYS) {
    const translation = i18n._(ANNOUNCEMENT[key])
    // Omit "null"/empty translations
    if (translation !== EMPTY_TRANSLATION) {
      content[key] = translation
    }
  }
  return content as AnnouncementContent
}

function isVideoUrl(url: string) {
  url = url.toLowerCase()
  const VIDEO_EXTENSIONS = ['mp4']
  return VIDEO_EXTENSIONS.some((extension) => url.endsWith(`.${extension}`))
}

const AnnouncementModal = () => {
  const { close, setBeforeClose } = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setBeforeClose(() => async () => {
      try {
        await updateAnnouncementVersion(await getAnnouncementVersion())
      } catch (e) {
        setErrorMessage((e as Error).message)
      }
    })
  }, [setBeforeClose])

  async function onReadMoreClicked(): Promise<void> {
    try {
      // Closes the modal
      await close()
    } catch (e) {
      setErrorMessage((e as Error).message)
    }
  }

  // Render the appropriate modal based on the type of content
  const content = getAnnouncementContent()
  let specificAnnouncementModal = null
  if (content.mediaUrl && isVideoUrl(content.mediaUrl)) {
    specificAnnouncementModal = (
      <VideoAnnouncementModal
        {...content}
        handleReadMoreClicked={onReadMoreClicked}
      />
    )
  } else {
    specificAnnouncementModal = (
      <GraphicAnnouncementModal
        {...content}
        handleReadMoreClicked={onReadMoreClicked}
      />
    )
  }

  return (
    <div className={styles.modal}>
      {specificAnnouncementModal}
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </div>
  )
}

export default AnnouncementModal
