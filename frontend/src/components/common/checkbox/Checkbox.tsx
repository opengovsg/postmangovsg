import cx from 'classnames'
import type { Dispatch, SetStateAction } from 'react'

import type { ReactNode } from 'react'

import styles from './Checkbox.module.scss'

const Checkbox = ({
  checked,
  onChange,
  className,
  children,
}: {
  checked: boolean
  onChange: Dispatch<SetStateAction<boolean>>
  className?: string
  children?: ReactNode
}) => {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      className={cx(styles.container, className)}
      onClick={() => onChange((val) => !val)}
    >
      <i
        className={cx(
          'bx',
          styles.icon,
          checked ? 'bxs-checkbox-checked' : 'bx-checkbox'
        )}
      ></i>
      {children}
    </div>
  )
}

export default Checkbox
