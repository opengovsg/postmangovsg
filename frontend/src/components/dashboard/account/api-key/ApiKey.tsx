import React, { useState, useRef, useContext, useEffect } from 'react'
import cx from 'classnames'

import { TextInputWithButton, ConfirmModal } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { regenerateApiKey } from 'services/account.service'

import styles from './ApiKey.module.scss'

const ApiKey = ({ hasApiKey }: { hasApiKey: boolean }) => {

  const [isApiKeyRevealed, setIsApiKeyRevealed] = useState(false)
  const [isRegeneratingApi, setIsRegeneratingApi] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const modalContext = useContext(ModalContext)
  const apiKeyRef = useRef(null as any)

  useEffect(() => {
    setApiKey(hasApiKey ? Array(30).fill('*').join('') : '')
  }, [hasApiKey])

  async function onRegenButtonClicked() {
    if (isApiKeyRevealed) {
      apiKeyRef.current.select()
      document.execCommand('copy')
    } else {
      if (apiKey) {
        modalContext.setModalContent(
          <ConfirmModal
            title='Generate new API key?'
            subtitle='This will invalidate the current API key.'
            buttonText='Confirm'
            onConfirm={onRegenConfirm}
          />)
      } else {
        onRegenConfirm()
      }
    }
  }

  async function onRegenConfirm() {
    setIsRegeneratingApi(true)
    const newApiKey = await regenerateApiKey()
    setIsRegeneratingApi(false)
    setApiKey(newApiKey)
    setIsApiKeyRevealed(true)
  }

  return (
    <>
      <h2>API Key</h2>
      <p>After generating your API key, please make a copy of it immediately as it will only be shown once. Upon leaving or refreshing this page, the key will be hidden.</p>
      <TextInputWithButton
        value={apiKey}
        onChange={() => { return }}
        onClick={onRegenButtonClicked}
        className={isApiKeyRevealed ? styles.greenButton : styles.blueButton}
        textRef={apiKeyRef}
        buttonDisabled={isRegeneratingApi}
      >
        {apiKey.length ? (isApiKeyRevealed ? 'Copy' : 'Regenerate') : 'Generate'} API key
        <i className={cx('bx', isApiKeyRevealed ? 'bx-copy' : 'bx-key')}></i>
      </TextInputWithButton>
    </>
  )
}

export default ApiKey
