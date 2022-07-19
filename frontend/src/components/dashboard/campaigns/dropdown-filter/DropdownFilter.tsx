import cx from 'classnames'
import { useState, useEffect, useRef, createRef } from 'react'

import styles from './DropdownFilter.module.scss'

const DropdownFilter = ({
  options,
  onSelect,
  defaultLabel,
  'aria-label': ariaLabel,
}: {
  options: { label: string; value: string }[]
  onSelect: (value: any) => any
  defaultLabel?: string
  'aria-label'?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const menuRef = createRef<HTMLDivElement>()
  const [dropdownMenuStyle, setDropdownMenuStyle] = useState<object>()

  function recalculateMenuStyle(): void {
    if (!containerRef.current) return
    const btnGroupPosition = containerRef.current?.getBoundingClientRect()
    setDropdownMenuStyle({
      top: `${
        (btnGroupPosition?.top as number) +
        (containerRef.current?.offsetHeight as number) +
        4
      }px`,
      left: `${btnGroupPosition?.left as number}px`,
    })
  }

  useEffect(() => {
    window.addEventListener('resize', recalculateMenuStyle)
    window.addEventListener('scroll', recalculateMenuStyle)
    return () => {
      window.removeEventListener('resize', recalculateMenuStyle)
      window.removeEventListener('scroll', recalculateMenuStyle)
    }
  })

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
    } else {
      setSelectedLabel('Select an option')
    }
  }, [onSelect])

  return (
    <div
      className={cx(styles.container, {
        [styles.open]: isOpen,
      })}
      ref={containerRef}
    >
      <div
        className={cx(styles.select)}
        onClick={() => {
          setIsOpen(!isOpen)
          recalculateMenuStyle
        }}
        role="listbox"
        aria-label={ariaLabel}
      >
        {selectedLabel}
        <i className={cx(styles.caret, 'bx bx-chevron-down')}></i>
      </div>
      <div className={styles.menu} style={dropdownMenuStyle} ref={menuRef}>
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

export default DropdownFilter
