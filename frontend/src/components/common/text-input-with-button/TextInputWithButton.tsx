import { useState, MutableRefObject } from 'react'
import * as React from 'react'
import cx from 'classnames'

import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { PrimaryButton, TextInput } from 'components/common'
import styles from './TextInputWithButton.module.scss'

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
  id,
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
  const isMounted = useIsMounted()

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
          id={id}
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
