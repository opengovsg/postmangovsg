import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

import { fetchMessage } from 'services/decrypt-mail.service'
import {
  TextInputWithButton,
  ErrorBlock,
  ProtectedPreview,
} from 'components/common'

import styles from './Protected.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/landing/landing-hero.png'

const Protected = () => {
  const { id } = useParams()
  const [password, setPassword] = useState('')
  const [decryptedMessage, setDecryptedMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function onAccessMail() {
    if (!id) return
    try {
      const data = await fetchMessage(id, password)
      setDecryptedMessage(data)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        {decryptedMessage ? (
          <ProtectedPreview html={decryptedMessage} />
        ) : (
          <>
            <img src={appLogo} alt="" />
            <img src={landingHero} className={styles.landingHero} alt="" />
            <h2>You&apos;ve got mail</h2>
            <TextInputWithButton
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={setPassword}
              buttonDisabled={!password}
              onClick={onAccessMail}
              buttonLabel="Access Mail"
              loadingButtonLabel="Decrypting your mail"
            ></TextInputWithButton>
            <ErrorBlock>{errorMsg}</ErrorBlock>
          </>
        )}
      </div>
    </div>
  )
}

export default Protected
