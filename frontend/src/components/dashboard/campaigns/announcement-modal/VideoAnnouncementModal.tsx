import ReactPlayer from 'react-player/lazy'

import { AnnouncementModalProps } from './AnnouncementModal'
import AnnouncementModalOptions from './AnnouncementModalOptions'
import styles from './VideoAnnouncementModal.module.scss'

const VideoAnnouncementModal = ({
  title,
  mediaUrl,
  primaryButtonUrl,
  primaryButtonText,
  secondaryButtonUrl,
  secondaryButtonText,
  handleReadMoreClicked,
}: AnnouncementModalProps) => {
  return (
    <>
      <h4 className={styles.title}>{title}</h4>
      <ReactPlayer
        url={mediaUrl}
        className={styles.video}
        controls
        playing
        width="100%"
        height="100%"
      />
      <div className={styles.options}>
        <AnnouncementModalOptions
          primaryButtonUrl={primaryButtonUrl}
          primaryButtonText={primaryButtonText}
          secondaryButtonUrl={secondaryButtonUrl}
          secondaryButtonText={secondaryButtonText}
          handleReadMoreClicked={handleReadMoreClicked}
        />
      </div>
    </>
  )
}

export default VideoAnnouncementModal
