import React from 'react'
import cx from 'classnames'

import styles from './ErrorBlock.module.scss'

const ErrorBlock = (props: any) => {

  const { className, children, ...otherProps } = props

  return (
    <div className={cx(styles.errorBlock, className)} {...otherProps}>
      {children}
    </div>
  )
}

/* e.g. children
 * <li><i className="bx"></i><p>text goes here...</p>
 * <li><i className="bx"></i><p>text goes here...</p>
 * <li><i className="bx"></i><p>text goes here...</p>
 */

export default ErrorBlock
