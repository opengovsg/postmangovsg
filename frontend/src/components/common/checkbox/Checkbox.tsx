import type { Dispatch, ReactNode, SetStateAction } from 'react'
import cx from 'classnames'

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
