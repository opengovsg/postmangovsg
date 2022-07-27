import cx from 'classnames'

import { useState, useRef, useContext, useEffect } from 'react'

import type { FunctionComponent } from 'react'

import styles from './ApiKey.module.scss'

import {
  TextInputWithButton,
  ConfirmModal,
  StepHeader,
} from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import { regenerateApiKey } from 'services/settings.service'

const RESET_COPY_TIMEOUT = 1000

interface ApiKeyProps {
  hasApiKey: boolean
  onGenerate?: () => void
}

enum ApiKeyState {
  GENERATE = 'GENERATE',
  COPY = 'COPY',
  COPIED = 'COPIED',
  REGENERATE = 'REGENERATE',
}

const ApiKey: FunctionComponent<ApiKeyProps> = ({ hasApiKey, onGenerate }) => {
  const [apiKey, setApiKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [apiKeyState, setApiKeyState] = useState<ApiKeyState>(
    ApiKeyState.GENERATE
  )

  const modalContext = useContext(ModalContext)
  const apiKeyRef = useRef<HTMLInputElement>()

  useEffect(() => {
    setApiKey(hasApiKey ? '*'.repeat(30) : '')
    setApiKeyState(hasApiKey ? ApiKeyState.REGENERATE : ApiKeyState.GENERATE)
  }, [hasApiKey])

  useEffect(() => {
    if (apiKeyState !== ApiKeyState.COPIED) return

    const timeoutId = setTimeout(() => {
      setApiKeyState(ApiKeyState.COPY)

      if (!apiKeyRef.current) return
      apiKeyRef.current.blur()
    }, RESET_COPY_TIMEOUT)

    return () => clearTimeout(timeoutId)
  }, [apiKeyState])

  async function onButtonClick() {
    switch (apiKeyState) {
      case ApiKeyState.GENERATE:
      case ApiKeyState.REGENERATE:
        if (apiKey) {
          modalContext.setModalContent(
            <ConfirmModal
              title="Are you sure?"
              subtitle="Generating a new API key will revoke your current one."
              buttonText="Confirm"
              onConfirm={onGenerateConfirm}
            />
          )
        } else {
          onGenerateConfirm()
        }
        break
      case ApiKeyState.COPY:
        if (!apiKeyRef.current) return
        apiKeyRef.current.select()
        document.execCommand('copy')
        setApiKeyState(ApiKeyState.COPIED)
        break
      default:
        break
    }
  }

  async function onGenerateConfirm() {
    setErrorMsg('')
    try {
      const newApiKey = await regenerateApiKey()
      setApiKey(newApiKey)
      setApiKeyState(ApiKeyState.COPY)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
    if (onGenerate) onGenerate()
  }

  let buttonLabel = ''
  let buttonIcon = ''
  let buttonClass = ''
  switch (apiKeyState) {
    case ApiKeyState.GENERATE:
      buttonLabel = 'Generate'
      buttonIcon = 'bx-key'
      buttonClass = styles.greenButton
      break
    case ApiKeyState.COPY:
      buttonLabel = 'Copy'
      buttonIcon = 'bx-copy'
      buttonClass = styles.greenButton
      break
    case ApiKeyState.COPIED:
      buttonLabel = 'Copied'
      buttonIcon = 'bx-check'
      buttonClass = styles.blueButton
      break
    case ApiKeyState.REGENERATE:
      buttonLabel = 'Regenerate'
      buttonIcon = 'bx-refresh'
      buttonClass = styles.blueButton
      break
    default:
      break
  }

  return (
    <>
      <StepHeader title="API Key">
        <p className={styles.helpText}>
          After generating your API key, please make a copy of it immediately as
          it will only be shown once. Upon leaving or refreshing this page, the
          key will be hidden.
        </p>
      </StepHeader>
      <TextInputWithButton
        value={apiKey}
        onChange={() => {
          return
        }}
        onClick={onButtonClick}
        className={buttonClass}
        textRef={apiKeyRef}
        errorMessage={errorMsg}
        buttonLabel={
          <>
            {buttonLabel} API key
            <i className={cx('bx', buttonIcon)} />
          </>
        }
      />
    </>
  )
}

export default ApiKey
