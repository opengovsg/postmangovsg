import cx from 'classnames'

import type { FunctionComponent, ReactNode } from 'react'

import styles from './BodyWrapper.module.scss'

interface BodyWrapperProps {
  /**
   * Hides any body content that overflows the viewport if set to `true`.
   * This prevents an external scrollbar from appearing when the modal is open.
   */
  wrap?: boolean
  children: ReactNode
}

const BodyWrapper: FunctionComponent<BodyWrapperProps> = ({
  wrap,
  children,
}) => <div className={cx(styles.base, { [styles.wrap]: wrap })}>{children}</div>

export default BodyWrapper
