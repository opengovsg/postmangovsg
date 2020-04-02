import React from 'react'
import styles from './TextInputWithButton.module.scss'
import { PrimaryButton, TextInput } from '../'

const TextInputWithButton = (props: any) => {
  const { value, onChange, onClick, children } = props

  return (
    <div className={styles.inputWithButton}>
      <TextInput className={styles.textInput} value={value} onChange={onChange} />
      <PrimaryButton className={styles.inputButton} onClick={onClick} >
        {children}
      </PrimaryButton>
    </div>
  )
}

export default TextInputWithButton