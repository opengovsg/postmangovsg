import React, { useState, useEffect, useRef } from 'react'
import cx from 'classnames'

import styles from './Dropdown.module.scss'

const Dropdown = ({ options, onSelect }: { options: { label: string; value: string }[]; onSelect: (value: string) => any }) => {

  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    function handleClickOutside(event: { target: any }) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  return (
    <div className={cx(styles.container, { [styles.open]: isOpen })} ref={containerRef}>
      <div className={styles.select} onClick={() => setIsOpen(!isOpen)}>
        {selectedLabel || 'Select an option'}
        <i className={cx(styles.caret, 'bx bx-caret-down')}></i>
      </div>
      <div className={styles.menu}>
        {options.map(o =>
          <div className={styles.item} key={o.value} onClick={() => onItemSelected(o)}>{o.label}</div>
        )}
      </div>
    </div>
  )
}

export default Dropdown
