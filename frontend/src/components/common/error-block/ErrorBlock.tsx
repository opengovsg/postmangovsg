import React from 'react'
import cx from 'classnames'

import styles from './ErrorBlock.module.scss'

const ErrorBlock = (props: any) => {

  const { className, children, absolute, ...otherProps } = props

  if (!children) {
    return null
  }

  return (
    <div className={styles.relativeContainer}>
      <div className={cx(styles.errorBlock, { [styles.absolute]: absolute }, className)} {...otherProps}>
        <li><i className='bx bx-error-circle'></i><p>{children}</p></li>
      </div>
    </div>
  )
}

export default ErrorBlock
