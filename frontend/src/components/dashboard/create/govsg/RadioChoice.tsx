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
  children?: ReactNode[]
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
      {rest.checked && children && children.length > 0 && (
        <div className={styles.body}>{children[0]}</div>
      )}
      {rest.checked && children && children.length > 1 && (
        <div className={styles.footer}>{children.slice(1)}</div>
      )}
    </div>
  )
}

export default RadioChoice
