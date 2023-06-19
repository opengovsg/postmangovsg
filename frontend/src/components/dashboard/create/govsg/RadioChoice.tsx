import cx from 'classnames'
import { ComponentProps, ReactNode } from 'react'

import styles from './RadioChoice.module.scss'

function RadioChoice({
  label,
  children,
  id,
  onChange,
  ...rest
}: ComponentProps<'input'> & {
  onChange: () => void
  id: string
  label: string
  children?: ReactNode
}) {
  return (
    <div
      className={
        rest.checked ? cx(styles.selected, styles.choice) : styles.choice
      }
    >
      <div className={styles.head} onClick={onChange}>
        <input type="radio" id={id} {...rest} onChange={onChange} />
        <label htmlFor={id}>{label}</label>
      </div>
      {rest.checked && children && (
        <div className={styles.body}>{children}</div>
      )}
    </div>
  )
}

export default RadioChoice
