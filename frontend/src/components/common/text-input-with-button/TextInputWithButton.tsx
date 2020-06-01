import React from 'react'
import cx from 'classnames'
import styles from './TextInputWithButton.module.scss'
import { PrimaryButton, TextInput } from '../'

const TextInputWithButton = (props: {
  value: string
  onChange: Function
  onClick: Function
  children: React.ReactNode
  type?: string
  buttonDisabled?: boolean
  inputDisabled?: boolean
  placeholder?: string
  className?: string
  textRef?: any
}) => {
  const {
    value,
    onChange,
    onClick,
    children,
    type,
    buttonDisabled,
    inputDisabled,
    placeholder,
    className,
    textRef,
  } = props

  function onFormSubmit(e: React.FormEvent) {
    onClick()
    // prevents page reload
    e.preventDefault()
  }

  return (
    <form className={styles.inputWithButton} onSubmit={onFormSubmit}>
      <TextInput
        className={styles.textInput}
        value={value}
        onChange={onChange}
        type={type}
        disabled={inputDisabled}
        placeholder={placeholder}
        ref={textRef}
      />
      <PrimaryButton
        className={cx(styles.inputButton, className)}
        disabled={buttonDisabled}
        type="submit"
      >
        {children}
      </PrimaryButton>
    </form>
  )
}

export default TextInputWithButton
