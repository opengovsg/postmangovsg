import React from 'react'
import cx from 'classnames'

import styles from './ProtectedPreview.module.scss'

const ProtectedPreview = ({
  html,
  className,
}: {
  html: string
  className?: string
}) => {
  return (
    <div
      className={cx(styles.preview, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  )
}

export default ProtectedPreview
