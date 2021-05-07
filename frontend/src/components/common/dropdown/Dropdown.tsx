import cx from 'classnames'
import { useState, useEffect, useRef } from 'react'

import styles from './Dropdown.module.scss'

const Dropdown = ({
  options,
  onSelect,
  defaultLabel,
  disabled,
  'aria-label': ariaLabel,
}: {
  options: { label: string; value: string }[]
  onSelect: (value: string) => any
  defaultLabel?: string
  disabled?: boolean
  'aria-label'?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    function handleClickOutside(event: { target: any }) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    // Bind the event listener
    document.addEventListener('mouseup', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mouseup', handleClickOutside)
    }
  }, [containerRef])

  function onItemSelected(item: { label: string; value: string }) {
    onSelect(item.value)
    setSelectedLabel(item.label)
    setIsOpen(false)
  }

  useEffect(() => {
    if (defaultLabel) {
      setSelectedLabel(defaultLabel)
      onSelect(defaultLabel)
    } else {
      setSelectedLabel('Select an option')
    }
  }, [defaultLabel, onSelect])

  return (
    <div
      className={cx(styles.container, {
        [styles.open]: isOpen,
      })}
      ref={containerRef}
    >
      <div
        className={cx(styles.select, { [styles.disabled]: disabled })}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="listbox"
        aria-label={ariaLabel}
      >
        {selectedLabel}
        <i className={cx(styles.caret, 'bx bx-caret-down')}></i>
      </div>
      <div className={styles.menu}>
        {options.map((o) => (
          <div
            role="option"
            aria-selected={selectedLabel === o.label}
            className={styles.item}
            key={o.value}
            onClick={() => onItemSelected(o)}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dropdown
