import cx from 'classnames'
import escapeHTML from 'escape-html'

import type { FunctionComponent } from 'react'

import { RichTextEditor } from '..'
import DetailBlock from '../detail-block'

import styles from './PreviewBlock.module.scss'

interface PreviewBlockProps {
  body: string
  subject?: string
  replyTo?: string | null
  from?: string
  className?: string
  richPreview?: boolean
}

const PreviewBlock: FunctionComponent<PreviewBlockProps> = ({
  body,
  subject,
  replyTo,
  from,
  className,
  richPreview,
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

  if (richPreview) {
    return (
      <DetailBlock>
        {from && (
          <>
            <h5>From</h5>
            <RichTextEditor value={from} preview shouldHighlightVariables />
          </>
        )}
        {subject && (
          <>
            <h5>Subject</h5>
            <RichTextEditor value={subject} preview shouldHighlightVariables />
          </>
        )}
        {body && (
          <>
            <h5>Body</h5>
            <RichTextEditor value={body} preview shouldHighlightVariables />
          </>
        )}
        {replyTo && (
          <>
            <h5>Replies</h5>
            <RichTextEditor value={replyTo} preview shouldHighlightVariables />
          </>
        )}
      </DetailBlock>
    )
  }

  function constructHtml() {
    function h(name: string, value?: string | null, escapeValue = true) {
      if (value)
        return `<h5>${name}</h5><p>${
          escapeValue ? escapeHTML(value) : value
        }</p>`
      return ''
    }

    const html = `${h('From', from)}
    ${h('Subject', subject)}
    ${h('Body', body, false)}
    ${h('Replies', replyTo)}`
    return html
  }

  return (
    <DetailBlock
      className={cx(styles.preview, className)}
      {...otherProps}
      dangerouslySetInnerHTML={{ __html: constructHtml() }}
    ></DetailBlock>
  )
}

export default PreviewBlock
