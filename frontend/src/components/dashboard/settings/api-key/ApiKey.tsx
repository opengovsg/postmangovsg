import React, { useState, useRef, useContext, useEffect } from 'react'
import cx from 'classnames'

import { TextInputWithButton, ConfirmModal } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { regenerateApiKey } from 'services/settings.service'

import styles from './ApiKey.module.scss'

interface ApiKeyProps {
  hasApiKey: boolean;
}

enum ApiKeyState {
  GENERATE = 'GENERATE',
  COPY = 'COPY',
  COPIED = 'COPIED',
  REGENERATE = 'REGENERATE'
}

const ApiKey: React.FunctionComponent<ApiKeyProps> = ({ hasApiKey }) => {
  const [apiKey, setApiKey] = useState('')
  const [isGeneratingApiKey, setIsRegeneratingApiKey] = useState(false)
  const [apiKeyState, setApiKeyState] = useState<ApiKeyState>(
    ApiKeyState.GENERATE
  )

  const modalContext = useContext(ModalContext)
  const apiKeyRef = useRef<HTMLInputElement>()

  useEffect(() => {
    setApiKey(hasApiKey ? '*'.repeat(30) : '')
    setApiKeyState(hasApiKey ? ApiKeyState.REGENERATE : ApiKeyState.GENERATE)
  }, [hasApiKey])

  async function onButtonClick() {
    switch (apiKeyState) {
      case ApiKeyState.GENERATE:
      case ApiKeyState.REGENERATE:
        if (apiKey) {
          modalContext.setModalContent(
            <ConfirmModal
              title='Generate new API key?'
              subtitle='This will invalidate the current API key.'
              buttonText='Confirm'
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
    setIsRegeneratingApiKey(true)
    const newApiKey = await regenerateApiKey()
    setIsRegeneratingApiKey(false)

    setApiKey(newApiKey)
    setApiKeyState(ApiKeyState.COPY)
  }

  let buttonLabel = ''
  let buttonIcon = ''
  switch (apiKeyState) {
    case ApiKeyState.GENERATE:
      buttonLabel = 'Generate'
      buttonIcon = 'bx-key'
      break
    case ApiKeyState.COPY:
      buttonLabel = 'Copy'
      buttonIcon = 'bx-copy'
      break
    case ApiKeyState.COPIED:
      buttonLabel = 'Copied'
      buttonIcon = 'bx-check'
      break
    case ApiKeyState.REGENERATE:
      buttonLabel = 'Regenerate'
      buttonIcon = 'bx-refresh'
      break
    default:
      break
  }

  return (
    <>
      <h2>API Key</h2>
      {(apiKeyState === ApiKeyState.COPY ||
        apiKeyState === ApiKeyState.COPIED) && (
        <p>
          After generating your API key, please make a copy of it immediately as
          it will only be shown once. Upon leaving or refreshing this page, the
          key will be hidden.
        </p>
      )}
      <TextInputWithButton
        value={apiKey}
        onChange={() => {
          return
        }}
        onClick={onButtonClick}
        className={
          apiKeyState === ApiKeyState.GENERATE ||
          apiKeyState === ApiKeyState.REGENERATE
            ? styles.greenButton
            : styles.blueButton
        }
        textRef={apiKeyRef}
        buttonDisabled={isGeneratingApiKey}
      >
        {buttonLabel} API key
        <i className={cx('bx', buttonIcon)} />
      </TextInputWithButton>
    </>
  )
}

export default ApiKey
