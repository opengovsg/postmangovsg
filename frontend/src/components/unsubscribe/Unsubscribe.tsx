import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import querystring from 'querystring'

import { ErrorBlock, PrimaryButton, TextButton } from 'components/common'

import styles from './Unsubscribe.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/unsubscribe/request-unsubscribe.png'
import cancelRequestHero from 'assets/img/unsubscribe/cancel-request.png'

import { unsubscribeRequest } from 'services/unsubscribe.service'

const Unsubscribe = () => {
  const { version } = useParams()
  const [errorMsg, setErrorMsg] = useState('')
  const [isUnsubscribed, setUnsubscribed] = useState(false)
  const [isStaying, setStaying] = useState(false)

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
      setErrorMsg('Invalid subscribe request')
    }
  }

  function renderUnsubscribeSection() {
    if (isStaying) {
      return (
        <>
          <h2>Excellent choice!</h2>
          <p>
            Thank you for staying subscribed to this campaign. Happy that we are
            still keeping in touch.
          </p>
        </>
      )
    }
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
          <div>
            <PrimaryButton
              onClick={() => {
                setStaying(true)
                setErrorMsg('')
              }}
              loadingPlaceholder="Processing"
            >
              I&#39;d rather stay
            </PrimaryButton>
            <TextButton onClick={onConfirmation}>Unsubscribe me</TextButton>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        <>
          <img src={appLogo} />
          <img
            src={isStaying ? cancelRequestHero : landingHero}
            className={styles.landingHero}
          />
          {renderUnsubscribeSection()}
          <ErrorBlock>{errorMsg}</ErrorBlock>
        </>
      </div>
    </div>
  )
}

export default Unsubscribe
