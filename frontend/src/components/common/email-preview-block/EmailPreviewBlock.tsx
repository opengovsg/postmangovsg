import cx from 'classnames'
import React from 'react'
import type { FC } from 'react'

import RichTextEditor from '../rich-text-editor'
import DetailBlock from '../detail-block'
import styles from './EmailPreviewBlock.module.scss'

interface EmailPreviewBlockProps {
  body: string
  subject?: string
  replyTo?: string | null
  from?: string
  className?: string
}

const EmailPreviewBlock: FC<EmailPreviewBlockProps> = ({
  body,
  subject,
  replyTo,
  from,
  className,
  ...otherProps
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
    <div className={cx(styles.preview, className)}>
      <h5>From</h5>
      <p>{from}</p>

      <h5>Subject</h5>
      <p>{subject}</p>

      <h5>Body</h5>
      <RichTextEditor value={body} preview {...otherProps} />

      <h5>Replies</h5>
      <p>{replyTo}</p>
    </div>
  )
}

export default EmailPreviewBlock
