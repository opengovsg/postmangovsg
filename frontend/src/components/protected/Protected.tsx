import cx from 'classnames'
import { useState } from 'react'

import { useParams } from 'react-router-dom'

import styles from './Protected.module.scss'

import appLogoGrey from 'assets/img/brand/app-logo-grey.svg'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/landing/landing-hero.png'
import { TextInputWithButton, ProtectedPreview } from 'components/common'
import Banner from 'components/landing/banner'

import { fetchMessage } from 'services/decrypt-mail.service'

interface CSSStylesWithZoom extends CSSStyleDeclaration {
  zoom: number
}

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
      // reset possible zooming in on iOS
      ;(window.parent.document.body.style as CSSStylesWithZoom).zoom = 1
      // reset page position caused by text input field focusing on mobiles
      window.scrollTo(0, 0)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <div className={styles.container}>
      <Banner />
      <div className={styles.outer}>
        {decryptedMessage ? (
          <div className={styles.inner}>
            <p className={styles.reminderText}>
              ONLY trust links that ends with .gov.sg and do not circulate the
              link to this page with anyone.
            </p>
            <ProtectedPreview html={decryptedMessage} />
            <div className={styles.footer}>
              <span className={styles.caption}>Delivered by</span>
              <img src={appLogoGrey} alt="Postman logo" />
            </div>
          </div>
        ) : (
          <div className={cx(styles.inner, styles.forPwPrompt)}>
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
          </div>
        )}
      </div>
    </div>
  )
}

export default Protected
