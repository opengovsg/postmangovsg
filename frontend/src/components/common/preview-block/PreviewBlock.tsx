import React from 'react'
import cx from 'classnames'
import escapeHTML from 'escape-html'

import InfoBlock from '../info-block'
import styles from './PreviewBlock.module.scss'

interface PreviewBlockProps {
  body: string
  subject?: string
  replyTo?: string | null
  from?: string
  className?: string
}

const PreviewBlock: React.FunctionComponent<PreviewBlockProps> = ({
  body,
  subject,
  replyTo,
  from,
  className,
  ...otherProps
}) => {
  if (!body && !subject) {
    return (
      <InfoBlock>
        <li>
          <i className="bx bx-loader-alt bx-spin"></i>
          <p>Loading preview...</p>
        </li>
      </InfoBlock>
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
    <InfoBlock
      className={cx(styles.preview, className)}
      {...otherProps}
      dangerouslySetInnerHTML={{ __html: constructHtml() }}
    ></InfoBlock>
  )
}

export default PreviewBlock
