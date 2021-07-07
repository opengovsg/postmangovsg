import cx from 'classnames'
import type { Dispatch, SetStateAction } from 'react'

import styles from './ToggleSwitch.module.scss'

const ToggleSwitch = ({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: Dispatch<SetStateAction<boolean>>
  className?: string
}) => {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      className={
        checked
          ? cx(styles.toggleSelector, styles.checked, className)
          : cx(styles.toggleSelector, styles.unchecked, className)
      }
      onClick={() => onChange((val) => !val)}
    >
      <div
        className={
          checked
            ? cx(styles.toggleSelectorSwitch, styles.checked)
            : cx(styles.toggleSelectorSwitch, styles.unchecked)
        }
      >
        <i className={cx('bx', styles.icon, checked ? 'bx-check' : 'bx-x')}></i>
      </div>
    </div>
  )
}

export default ToggleSwitch
