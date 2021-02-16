import React from 'react'

import styles from './GraphicAnnouncementModal.module.scss'
import AnnouncementModalOptions from './AnnouncementModalOptions'
import { AnnouncementModalProps } from './AnnouncementModal'

const GraphicAnnouncementModal = ({
  title,
  mediaUrl,
  subtext,
  primaryButtonUrl,
  primaryButtonText,
  secondaryButtonUrl,
  secondaryButtonText,
  handleReadMoreClicked,
}: AnnouncementModalProps) => {
  return (
    <>
      <img className={styles.graphic} src={mediaUrl} alt="Modal graphic"></img>
      <h4 className={styles.title}>{title}</h4>
      <div className={styles.subtext}>{subtext}</div>
      <div className={styles.options}>
        <AnnouncementModalOptions
          primaryButtonText={primaryButtonText}
          primaryButtonUrl={primaryButtonUrl}
          secondaryButtonText={secondaryButtonText}
          secondaryButtonUrl={secondaryButtonUrl}
          handleReadMoreClicked={handleReadMoreClicked}
        />
      </div>
    </>
  )
}

export default GraphicAnnouncementModal
