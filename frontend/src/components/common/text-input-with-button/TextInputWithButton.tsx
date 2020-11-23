import React, { useState, useRef, useEffect, MutableRefObject } from 'react'
import cx from 'classnames'
import styles from './TextInputWithButton.module.scss'
import { PrimaryButton, TextInput } from '../'

interface TextInputWithButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void
  onClick: () => void | Promise<void>
  buttonDisabled?: boolean
  inputDisabled?: boolean
  textRef?: MutableRefObject<HTMLInputElement | undefined>
  buttonLabel?: React.ReactNode
  loadingButtonLabel?: React.ReactNode
  errorMessage?: string | null
}

const TextInputWithButton: React.FunctionComponent<TextInputWithButtonProps> = ({
  value,
  onChange,
  onClick,
  type,
  buttonDisabled,
  inputDisabled,
  placeholder,
  className,
  textRef,
  buttonLabel,
  loadingButtonLabel,
  errorMessage,
}) => {
  const [asyncLoading, setAsyncLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const asyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setAsyncLoading(true)
    try {
      await onClick()
    } finally {
      // Only enable if still mounted
      if (isMounted.current) {
        setAsyncLoading(false)
      }
    }
  }

  return (
    <form className={styles.textInputForm} onSubmit={asyncSubmit}>
      <div className={styles.inputWithButton}>
        <TextInput
          className={cx(styles.textInput, { [styles.error]: errorMessage })}
          value={value}
          onChange={onChange}
          type={type}
          disabled={inputDisabled || asyncLoading}
          placeholder={placeholder}
          ref={textRef}
        />
        <PrimaryButton
          className={cx(styles.inputButton, className)}
          disabled={buttonDisabled || asyncLoading}
          type="submit"
        >
          {asyncLoading ? loadingButtonLabel : buttonLabel}
        </PrimaryButton>
      </div>
      {errorMessage && (
        <span className={styles.errorMessage}>{errorMessage}</span>
      )}
    </form>
  )
}

export default TextInputWithButton
