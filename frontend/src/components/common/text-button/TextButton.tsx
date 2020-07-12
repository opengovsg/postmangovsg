import React from 'react'
import styles from './TextButton.module.scss'

const TextButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return <button className={styles.textButton} {...props}></button>
}

export default TextButton
