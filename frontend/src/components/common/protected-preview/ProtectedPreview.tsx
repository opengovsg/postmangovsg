import React from 'react'
import cx from 'classnames'

import styles from './ProtectedPreview.module.scss'

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
