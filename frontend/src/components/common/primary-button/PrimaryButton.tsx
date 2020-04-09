import React from 'react'
import styles from './PrimaryButton.module.scss'

const PrimaryButton = (props: any) => {
  const { className, children, ...otherProps } = props
  return (
    <button className={`${styles.button} ${className}`} {...otherProps}>
      {children}
    </button>
  )
}

export default PrimaryButton