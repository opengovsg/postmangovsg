import cx from 'classnames'
import { useState } from 'react'

import type { MouseEvent as ReactMouseEvent } from 'react'

import styles from './ActionButton.module.scss'

const ActionButton = (props: any) => {
  const { className, children, ...otherProps } = props
  const [toggleDropdown, setToggleDropdown] = useState(false)

  function handleToggleDropdown(
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) {
    event.stopPropagation()
    setToggleDropdown((toggleDropdown) => !toggleDropdown)
  }

  return (
    <div className={styles.activeButtonContainer}>
      <button
        type="button"
        className={cx(styles.actionButton, className)}
        disabled={otherProps.disabled}
        {...otherProps}
      >
        <div className={styles.content}>{children[0] || children}</div>
        {children.length > 1 && (
          <div
            className={styles.arrow}
            onClick={(e) => handleToggleDropdown(e)}
          >
            <i className={cx(styles.icon, 'bx bx-chevron-down')}></i>
          </div>
        )}
      </button>
      {toggleDropdown && (
        <div
          className={styles.dropdownMenu}
          onMouseLeave={() => setToggleDropdown(false)}
        >
          {children.slice(1, children.length)}
        </div>
      )}
    </div>
  )
}

export default ActionButton
