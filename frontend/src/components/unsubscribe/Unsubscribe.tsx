import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import querystring from 'querystring'
import { Trans } from '@lingui/macro'

import { ErrorBlock, PrimaryButton, TextButton } from 'components/common'

import styles from './Unsubscribe.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/unsubscribe/request-unsubscribe.png'
import cancelRequestHero from 'assets/img/unsubscribe/cancel-request.png'

import { unsubscribeRequest } from 'services/unsubscribe.service'
import Banner from 'components/landing/banner'

const Unsubscribe = () => {
  const { version } = useParams()
  const [errorMsg, setErrorMsg] = useState('')
  const [isUnsubscribed, setUnsubscribed] = useState(false)
  const [isStaying, setStaying] = useState(false)

  function validateParams(params: querystring.ParsedUrlQuery): void {
    // Ensure that all required params exists and are strings and not []strings
    const isValid = ['c', 'r', 'h'].every(
      (key) => params[key] && typeof params[key] === 'string'
    )
    if (!isValid) {
      throw new Error('Parameters are missing or invalid')
    }
  }

  async function onConfirmation() {
    try {
      // Version is set to 'test' when the unsub link is generated from a campaign
      // test email. As such, we should not make any API calls.
      if (version !== 'test') {
        const query = new URL(window.location.href).searchParams.toString()
        const params = querystring.parse(query)
        validateParams(params)

        const { c: campaignId, r: recipient, h: hash } = params

        await unsubscribeRequest({
          campaignId: +campaignId,
          recipient: recipient as string,
          hash: hash as string,
          version: version as string,
        })
      }
      setUnsubscribed(true)
    } catch (err) {
      setErrorMsg('Invalid unsubscribe request')
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
          <div className={styles.options}>
            <PrimaryButton
              onClick={() => {
                setStaying(true)
                setErrorMsg('')
              }}
              loadingPlaceholder="Processing"
            >
              <Trans>I&#39;d rather stay</Trans>
            </PrimaryButton>
            <TextButton minButtonWidth onClick={onConfirmation}>
              <Trans>Unsubscribe me</Trans>
            </TextButton>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.container}>
      <Banner />
      <div className={styles.outer}>
        <div className={styles.inner}>
          <>
            <img src={appLogo} alt="Postman logo" className={styles.appLogo} />
            <img
              src={isStaying ? cancelRequestHero : landingHero}
              alt="Landing hero"
              className={styles.landingHero}
            />
            {renderUnsubscribeSection()}
            <ErrorBlock>{errorMsg}</ErrorBlock>
          </>
        </div>
      </div>
    </div>
  )
}

export default Unsubscribe
