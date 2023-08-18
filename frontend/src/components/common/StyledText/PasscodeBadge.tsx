import cx from 'classnames'

import styles from './PasscodeBadge.module.scss'

interface PasscodeBadgeProps {
  label: string
  placeholder: string
}

export const PasscodeBadge = ({ label, placeholder }: PasscodeBadgeProps) => {
  const logOnClick = () => {
    // TODO: Log click
  }

  return (
    <details>
      <summary onClick={logOnClick}>Click to reveal</summary>
      <span className={label ? cx(styles.positive) : cx(styles.negative)}>
        {label ? label : placeholder}
      </span>
    </details>
  )
}
