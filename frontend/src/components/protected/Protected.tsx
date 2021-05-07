import { useState } from 'react'

import { useParams } from 'react-router-dom'

import styles from './Protected.module.scss'

import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/landing/landing-hero.png'
import { TextInputWithButton, ProtectedPreview } from 'components/common'
import Banner from 'components/landing/banner'

import { fetchMessage } from 'services/decrypt-mail.service'

const Protected = () => {
  const { id } = useParams<{ id: string }>()
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
    <div className={styles.container}>
      <Banner />
      <div className={styles.outer}>
        <div className={styles.inner}>
          {decryptedMessage ? (
            <ProtectedPreview html={decryptedMessage} />
          ) : (
            <div className={styles.verification}>
              <img src={appLogo} className={styles.appLogo} alt="" />
              <img src={landingHero} className={styles.landingHero} alt="" />
              <h3 className={styles.title}>You&apos;ve got mail</h3>
              <div className={styles.passwordInput}>
                <TextInputWithButton
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={setPassword}
                  buttonDisabled={!password}
                  onClick={onAccessMail}
                  buttonLabel="Access Mail"
                  loadingButtonLabel="Decrypting your mail"
                  errorMessage={errorMsg}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Protected
