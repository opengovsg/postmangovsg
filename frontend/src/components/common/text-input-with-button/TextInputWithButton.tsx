import React from 'react'
import styles from './TextInputWithButton.module.scss'
import { PrimaryButton, TextInput } from '../'

const TextInputWithButton = (props: {
  value: string;
  onChange: Function;
  onClick: Function;
  children: React.ReactNode;
  type: string | undefined;
  disabled?: boolean | undefined;
}) => {
  const { value, onChange, onClick, children, type, disabled } = props

  function onFormSubmit(e: React.FormEvent) {
    onClick()
    // prevents page reload
    e.preventDefault()
  }

  return (
    <form className={styles.inputWithButton} onSubmit={onFormSubmit}>
      <TextInput className={styles.textInput} value={value} onChange={onChange} type={type} disabled={disabled} />
      <PrimaryButton className={styles.inputButton} disabled={disabled} type="submit">
        {children}
      </PrimaryButton>
    </form>
  )
}

export default TextInputWithButton