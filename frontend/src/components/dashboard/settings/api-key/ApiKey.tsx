import React, { useState, useRef, useContext, useEffect } from 'react'
import cx from 'classnames'

import {
  TextInputWithButton,
  ConfirmModal,
  ErrorBlock,
} from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { regenerateApiKey } from 'services/settings.service'

import styles from './ApiKey.module.scss'

const RESET_COPY_TIMEOUT = 1000

interface ApiKeyProps {
  hasApiKey: boolean
}

enum ApiKeyState {
  GENERATE = 'GENERATE',
  COPY = 'COPY',
  COPIED = 'COPIED',
  REGENERATE = 'REGENERATE',
}

const ApiKey: React.FunctionComponent<ApiKeyProps> = ({ hasApiKey }) => {
  const [apiKey, setApiKey] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
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

    setTimeout(() => {
      setApiKeyState(ApiKeyState.COPY)

      if (!apiKeyRef.current) return
      apiKeyRef.current.blur()
    }, RESET_COPY_TIMEOUT)
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
    setErrorMsg(null)
    try {
      const newApiKey = await regenerateApiKey()
      setApiKey(newApiKey)
      setApiKeyState(ApiKeyState.COPY)
    } catch (e) {
      setErrorMsg(e.message)
    }
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
        className={buttonClass}
        textRef={apiKeyRef}
        buttonLabel={
          <>
            {buttonLabel} API key
            <i className={cx('bx', buttonIcon)} />
          </>
        }
      />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default ApiKey
