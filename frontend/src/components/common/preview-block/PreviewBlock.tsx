import React from 'react'
import cx from 'classnames'

import InfoBlock from '../info-block'
import styles from './PreviewBlock.module.scss'

const PreviewBlock = (props: any) => {

  const { className, subject, body, ...otherProps } = props

  if (!body && !subject) {
    return null
  }

  function constructHtml() {
    let html = `<p>${body}</p>`
    if (body.subject) {
      html = html + `
        <h5>Subject</h5>
        <p>${subject}</p>
        <h5>Body</h5>
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
