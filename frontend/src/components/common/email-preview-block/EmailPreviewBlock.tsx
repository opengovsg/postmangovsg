import cx from 'classnames'
import type { FC } from 'react'

import DetailBlock from '../detail-block'

import styles from './EmailPreviewBlock.module.scss'

interface EmailPreviewBlockProps {
  body: string
  themedBody?: string
  subject?: string
  replyTo?: string | null
  from?: string
  className?: string
}

const EmailPreviewBlock: FC<EmailPreviewBlockProps> = ({
  body,
  themedBody,
  subject,
  replyTo,
  from,
  className,
}) => {
  if (!body && !subject) {
    return (
      <DetailBlock>
        <li>
          <i className="bx bx-loader-alt bx-spin"></i>
          <p>Loading preview...</p>
        </li>
      </DetailBlock>
    )
  }

  return (
    <>
      <div className={cx(styles.previewInfo, className)}>
        <h5>From</h5>
        <p>{from}</p>

        <h5>Subject</h5>
        <p>{subject}</p>

        <h5>Replies</h5>
        <p>{replyTo}</p>
      </div>

      <div
        className={styles.previewBody}
        dangerouslySetInnerHTML={{ __html: themedBody ?? '' }}
      ></div>
    </>
  )
}

export default EmailPreviewBlock
