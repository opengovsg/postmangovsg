import React from 'react'
import cx from 'classnames'

import InfoBlock from '../info-block'
import styles from './PreviewBlock.module.scss'

interface PreviewBlockProps {
  body: string;
  subject?: string;
  replyTo?: string | null;
  className?: string;
}

const PreviewBlock: React.FunctionComponent<PreviewBlockProps> = ({
  body,
  subject,
  replyTo,
  className,
  ...otherProps
}) => {
  if (!body && !subject) {
    return null
  }

  function constructHtml() {
    let html = `<p>${body}</p>`
    if (subject) {
      html = `
        <h5>Subject</h5>
        <p>${subject}</p>
        <h5>Body</h5>
      ` + html
    }
    if (replyTo) {
      html = html + `
        <h5>Replies</h5>
        <p>${replyTo}</p>
      `
    }
    return html
  }

  return (
    <InfoBlock className={cx(styles.preview, className)} {...otherProps}
      dangerouslySetInnerHTML={{ __html: constructHtml() }}>
    </InfoBlock>
  )
}


export default PreviewBlock
