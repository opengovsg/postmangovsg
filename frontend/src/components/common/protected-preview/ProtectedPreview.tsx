import React from 'react'
import cx from 'classnames'

import styles from './ProtectedPreview.module.scss'

/**
 * For breaking changes to styles, a new css class must be
 * created in ProtectedPreview.module.scss and stored as a new
 * column in protected_messages table in the db. This class version
 * will be fetched together with the payload and dynamically rendered.
 */
const ProtectedPreview = ({
  html,
  style = 'style1',
}: {
  html: string
  style?: string
}) => {
  return (
    <div
      className={cx(styles.preview, styles[style])}
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  )
}

export default ProtectedPreview
