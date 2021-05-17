import cx from 'classnames'

import { useState, MutableRefObject } from 'react'

import type {
  InputHTMLAttributes,
  ReactNode,
  FunctionComponent,
  FormEvent,
} from 'react'

import styles from './TextInputWithButton.module.scss'

import { PrimaryButton, TextInput } from 'components/common'
import useIsMounted from 'components/custom-hooks/use-is-mounted'

interface TextInputWithButtonProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void
  onClick: () => void | Promise<void>
  buttonDisabled?: boolean
  inputDisabled?: boolean
  textRef?: MutableRefObject<HTMLInputElement | undefined>
  buttonLabel?: ReactNode
  loadingButtonLabel?: ReactNode
  errorMessage?: string | null
}

const TextInputWithButton: FunctionComponent<TextInputWithButtonProps> = ({
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

  const asyncSubmit = async (e: FormEvent) => {
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
