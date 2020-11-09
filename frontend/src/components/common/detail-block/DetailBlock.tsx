import React from 'react'
import cx from 'classnames'

import styles from './DetailBlock.module.scss'

const DetailBlock = (props: any) => {
  const { className, children, ...otherProps } = props

  return (
    <div className={cx(styles.detailBlock, className)} {...otherProps}>
      {children}
    </div>
  )
}

/* e.g. children
 * <li><i className="bx"></i><p>text goes here...</p></li>
 * <li><i className="bx"></i><p>text goes here...</p></li>
 * <li><i className="bx"></i><p>text goes here...</p></li>
 */

export default DetailBlock
