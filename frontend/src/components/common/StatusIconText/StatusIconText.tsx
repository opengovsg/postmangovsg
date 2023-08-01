import cx from 'classnames'

import styles from './StatusIconText.module.scss'

const ICONS: Record<string, JSX.Element> = {
  ERROR: <i className={cx(styles.icon, styles.red, 'bx bx-error-circle')} />,
  UNSENT: <i className={cx(styles.icon, styles.blue, 'bx bx-time-five')} />,
  SENT: <i className={cx(styles.icon, styles.green, 'bx bx-check-circle')} />,
  DELIVERED: (
    <i className={cx(styles.icon, styles.grey, 'bx bx-check-double')} />
  ),
  INVALID: <i className={cx(styles.icon, styles.red, 'bx bx-minus-circle')} />,
}

interface StatusIconProps {
  label: string
}

export const StatusIconText = ({ label }: StatusIconProps) => {
  return (
    <>
      {ICONS[label]}
      {label}
    </>
  )
}
