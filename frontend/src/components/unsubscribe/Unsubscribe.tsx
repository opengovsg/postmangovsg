import React, { useState, useEffect } from 'react'
import { useLocation, useParams, Redirect } from 'react-router-dom'
import querystring from 'querystring'

import { ErrorBlock, PrimaryButton } from 'components/common'

import styles from './Unsubscribe.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
import landingHero from 'assets/img/unsubscribe/request-unsubscribe.png'

import {
  unsubscribeRequest,
  isUserUnsubscribed,
} from 'services/unsubscribe.service'

const Unsubscribe = () => {
  const { version } = useParams()
  const location = useLocation()
  const [errorMsg, setErrorMsg] = useState('')
  const [isValid, setValid] = useState(true)
  const [isUnsubscribed, setUnsubscribed] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [hash, setHash] = useState('')

  async function onConfirmation() {
    try {
      await unsubscribeRequest({
        campaignId: +campaignId,
        recipient,
        hash,
        version,
      })
      setUnsubscribed(true)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function isUrlValid({
    campaignId,
    recipient,
    hash,
    version,
  }: {
    campaignId: number
    recipient: string
    hash: string
    version: string
  }) {
    try {
      const isUnsub = await isUserUnsubscribed({
        campaignId: +campaignId,
        recipient,
        hash,
        version,
      })

      setUnsubscribed(isUnsub)
      setValid(true)
      return
    } catch (e) {
      setValid(false)
    }
  }

  useEffect(() => {
    const query = new URL(window.location.href).searchParams.toString()
    const params = querystring.parse(query)
    // Check to make sure that the search params are all strings and not []strings
    const isValid = Object.values(params).every((v) => typeof v === 'string')
    if (!isValid) {
      setValid(isValid)
      return
    }

    const { c, r, h } = params

    setCampaignId(c as string)
    setRecipient(r as string)
    setHash(h as string)

    // Seems like setting state is asynchronous, so can't rely on the values here
    isUrlValid({
      campaignId: +c,
      recipient: r as string,
      hash: h as string,
      version,
    })
  }, [location.search, version])

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
      {isValid ? (
        <div className={styles.inner}>
          <>
            <img src={appLogo} />
            <img src={landingHero} className={styles.landingHero} />
            {renderUnsubscribeSection()}
            <ErrorBlock>{errorMsg}</ErrorBlock>
          </>
        </div>
      ) : (
        <Redirect to="/"></Redirect>
      )}
    </div>
  )
}

export default Unsubscribe
