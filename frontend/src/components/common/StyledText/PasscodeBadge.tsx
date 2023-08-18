import cx from 'classnames'

import styles from './PasscodeBadge.module.scss'

interface PasscodeBadgeProps {
  label: string
  placeholder: string
  onClick: () => void
}

export const PasscodeBadge = ({
  label,
  placeholder,
  onClick,
}: PasscodeBadgeProps) => {
  return (
    <details>
      <summary onClick={onClick}>Click to reveal</summary>
      <span className={label ? cx(styles.positive) : cx(styles.negative)}>
        {label ? label : placeholder}
      </span>
    </details>
  )
}
