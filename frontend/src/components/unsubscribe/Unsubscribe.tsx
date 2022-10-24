import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Trans } from '@lingui/macro'
import appLogo from 'assets/img/brand/app-logo.svg'
import cancelRequestHero from 'assets/img/unsubscribe/cancel-request.png'
import landingHero from 'assets/img/unsubscribe/request-unsubscribe.png'
import {
  ErrorBlock,
  PrimaryButton,
  TextButton,
  TextInput,
} from 'components/common'
import Banner from 'components/landing/banner'
import querystring from 'querystring'
import {
  subscribeAgain,
  unsubscribeRequest,
} from 'services/unsubscribe.service'

import styles from './Unsubscribe.module.scss'

const Unsubscribe = () => {
  const location = useLocation()
  const { version } = useParams<{ version: string }>()
  const [errorMsg, setErrorMsg] = useState('')
  const [isUnsubscribed, setUnsubscribed] = useState(false)
  const [isStaying, setStaying] = useState(false)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

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
        const query = location.search.substring(1)
        const params = querystring.parse(query)
        validateParams(params)

        const { c: campaignId, r: recipient, h: hash } = params

        await unsubscribeRequest({
          campaignId: +campaignId,
          recipient: recipient as string,
          hash: hash as string,
          version: version as string,
          reason: reason !== 'other' ? reason : otherReason,
        })
      }
      setUnsubscribed(true)
    } catch (err) {
      setErrorMsg('Invalid unsubscribe request')
    }
  }

  async function onSubscribeAgain() {
    try {
      // Version is set to 'test' when the unsub link is generated from a campaign
      // test email. As such, we should not make any API calls.
      if (version !== 'test') {
        const query = location.search.substring(1)
        const params = querystring.parse(query)
        validateParams(params)

        const { c: campaignId, r: recipient, h: hash } = params

        await subscribeAgain({
          campaignId: +campaignId,
          recipient: recipient as string,
          hash: hash as string,
          version: version as string,
        })
      }
      setStaying(true)
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again')
    }
  }

  function renderUnsubscribeSection() {
    if (isStaying) {
      return (
        <>
          <img
            src={cancelRequestHero}
            alt="Landing hero"
            className={styles.landingHero}
          />
          <h2>Excellent choice!</h2>
          <p>
            Thank you for staying subscribed. Happy that we are still keeping in
            touch.
          </p>
        </>
      )
    }
    if (isUnsubscribed) {
      return (
        <>
          <img
            src={landingHero}
            alt="Landing hero"
            className={styles.landingHero}
          />
          <h2>Unsubscribe request successful</h2>
          <p>
            We will inform the sender about your wish to unsubscribe to this
            campaign. If you have unsubscribed from this campaign by mistake,
            please subscribe back.
          </p>
          <TextButton minButtonWidth onClick={onSubscribeAgain}>
            <Trans>Subscribe me back</Trans>
          </TextButton>
        </>
      )
    } else {
      return (
        <>
          <div className={styles.optionContainer}>
            <h2>Let us know your reason</h2>

            {[
              'I no longer want to receive this type of email campaign',
              'I never signed up for this mailing list',
              'The emails are inappropriate',
              'The emails are spam and should be reported',
            ].map((r) => (
              <label key={r}>
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={r === reason}
                  onChange={() => setReason(r)}
                />
                {r}
              </label>
            ))}
            <label>
              <input
                type="radio"
                name="reason"
                value="other"
                checked={reason === 'other'}
                onChange={() => setReason('other')}
              />
              Other (please specify)
            </label>
            {reason === 'other' && (
              <TextInput
                value={otherReason}
                onChange={setOtherReason}
                placeholder="Describe here"
              />
            )}
          </div>
          <div className={styles.options}>
            <PrimaryButton
              loadingPlaceholder="Processing unsubscribe request"
              disabled={!reason || (reason === 'other' && !otherReason)}
              onClick={onConfirmation}
            >
              <Trans>Proceed to unsubscribe</Trans>
            </PrimaryButton>
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
            {renderUnsubscribeSection()}
            <ErrorBlock>{errorMsg}</ErrorBlock>
          </>
        </div>
      </div>
    </div>
  )
}

export default Unsubscribe
