import React, { useEffect, useState } from 'react'
import cx from 'classnames'

import styles from './ErrorToast.module.scss'

const DISPLAY_TIME = 3500
const FADE_TIME = 1000

const ErrorToast = ({ children, position, resetToast }: {children: React.ReactNode; position: string; resetToast: Function}) => {

  const [className, setClassName] = useState('')

  function reset() {
    // reset toast position after fade
    setTimeout(() => {
      setClassName('')
      resetToast()
    }, FADE_TIME)
  }

  useEffect(() => {
    if (children) {
      // Workaround to wait for toast position to initialise first
      // else toast enters in a diagonal manner
      setTimeout(() => {
        setClassName(styles.enter)
      }, 500)

      setTimeout(() => {
        setClassName(`${styles.enter} ${styles.fade}`)
        reset()
      }, DISPLAY_TIME)
    }
  }, [children])

  return (
    <div className={cx(
      styles[position],
      className
    )}>
      {children}
    </div>
  )
}

export default ErrorToast
