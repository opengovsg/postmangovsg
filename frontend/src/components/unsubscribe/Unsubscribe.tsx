import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import querystring from 'querystring'

import { ErrorBlock, PrimaryButton } from 'components/common'

import styles from './Unsubscribe.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/unsubscribe/request-unsubscribe.png'

import { unsubscribeRequest } from 'services/unsubscribe.service'

const Unsubscribe = () => {
  const { version } = useParams()
  const [errorMsg, setErrorMsg] = useState('')
  const [isUnsubscribed, setUnsubscribed] = useState(false)

  async function onConfirmation() {
    try {
      const query = new URL(window.location.href).searchParams.toString()
      const params = querystring.parse(query)

      // Check to make sure that the search params are all strings and not []strings
      const isValid = Object.values(params).every((v) => typeof v === 'string')
      if (!isValid) {
        throw new Error(
          'Search params should all be strings and not array of strings.'
        )
      }

      const { c: campaignId, r: recipient, h: hash } = params

      await unsubscribeRequest({
        campaignId: +campaignId,
        recipient: recipient as string,
        hash: hash as string,
        version,
      })
      setUnsubscribed(true)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  function renderUnsubscribeSection() {
    if (isUnsubscribed) {
      return (
        <>
          <h2>Unsubscribed successfully.</h2>
          <p>
            You have been removed from the agency’s mailing list. If you have
            unsubscribed by mistake, you can send a request email to the agency.
          </p>
        </>
      )
    } else {
      return (
        <>
          <h2>We&#39;re sad to see you go!</h2>
          <p>
            We will inform the agency that sent you this campaign about your
            wish to unsubscribe. You will be removed from their mailing list.
          </p>
          <PrimaryButton
            onClick={onConfirmation}
            loadingPlaceholder="Processing"
          >
            Unsubscribe
          </PrimaryButton>
        </>
      )
    }
  }

  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        <>
          <img src={appLogo} />
          <img src={landingHero} className={styles.landingHero} />
          {renderUnsubscribeSection()}
          <ErrorBlock>{errorMsg}</ErrorBlock>
        </>
      </div>
    </div>
  )
}

export default Unsubscribe
