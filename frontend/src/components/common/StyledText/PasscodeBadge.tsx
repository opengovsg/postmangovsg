import cx from 'classnames'

import styles from './PasscodeBadge.module.scss'

interface PasscodeBadgeProps {
  key: string
  label: string
  placeholder: string
  onClick: () => void
}

export const PasscodeBadge = ({
  key,
  label,
  placeholder,
  onClick,
}: PasscodeBadgeProps) => {
  return (
    <details key={key}>
      <summary onClick={onClick}>Click to reveal</summary>
      <span className={label ? cx(styles.positive) : cx(styles.negative)}>
        {label ? label : placeholder}
      </span>
    </details>
  )
}
