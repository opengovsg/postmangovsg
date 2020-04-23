import React from 'react'
import cx from 'classnames'

import styles from './InfoBlock.module.scss'

const InfoBlock = (props: any) => {

  const { className, children, ...otherProps } = props

  return (
    <div className={cx(styles.infoBlock, className)} {...otherProps}>
      {children}
    </div>
  )
}

/* e.g. children
 * <li><i className="bx"></i><span>text goes here...</span></li>
 * <li><i className="bx"></i><span>text goes here...</span></li>
 * <li><i className="bx"></i><span>text goes here...</span></li>
 */

export default InfoBlock
