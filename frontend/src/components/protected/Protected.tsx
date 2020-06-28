import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import Lottie from 'react-lottie'
import { fetchMessage } from 'services/protected.service'

import { TextInputWithButton, ErrorBlock } from 'components/common'
import styles from './Protected.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingAnimation from 'assets/lottie/landing.json'

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
      console.error(err)
    }
  }

  return (
    <div className={styles.protected}>
      <div className={styles.modal}>
        {!decryptedMessage && (
          <>
            <img src={appLogo} />
            <Lottie
              options={{
                loop: false,
                autoplay: true,
                animationData: landingAnimation,
                rendererSettings: {
                  preserveAspectRatio: 'xMidYMid slice',
                },
              }}
            />
            <h1>You&apos;ve got mail</h1>
            <div>
              <TextInputWithButton
                type="password"
                className={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={setPassword}
                buttonDisabled={!password}
                onClick={onAccessMail}
              >
                Access mail
              </TextInputWithButton>
              <ErrorBlock>{errorMsg}</ErrorBlock>
            </div>
          </>
        )}
        {decryptedMessage}
      </div>
    </div>
  )
}

export default Protected
