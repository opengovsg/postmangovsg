import cx from 'classnames'

import styles from './CloseButton.module.scss'

const CloseButton = (props: any) => {
  const { className, ...otherProps } = props

  return (
    <button className={cx(styles.close, className)} {...otherProps}>
      +
    </button>
  )
}

export default CloseButton
