import cx from 'classnames'

import styles from './PasscodeBadge.module.scss'

interface PasscodeBadgeProps {
  key: string
  label: string
  placeholder: string
}

export const PasscodeBadge = ({
  key,
  label,
  placeholder,
}: PasscodeBadgeProps) => {
  return (
    <span
      key={key}
      className={label ? cx(styles.positive) : cx(styles.negative)}
    >
      {label ? label : placeholder}
    </span>
  )
}
