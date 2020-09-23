import React from 'react'
import { OutboundLink } from 'react-ga'
// import { getCustomFromAddresses } from 'services/settings.service'
import { PrimaryButton } from 'components/common'
import styles from './CustomDomain.module.scss'
import { Trans } from '@lingui/macro'
import { LINKS } from 'config'
import { i18n } from 'locales'

const CustomDomain = () => {
  const title = 'From Address'
  return (
    <div className={styles.customDomainContainer}>
      <div>
        <h2>{title}</h2>
      </div>
      <p>
        You can now add your email address as the From Address. Recipients will
        receive emails from this address, instead of the default{' '}
        <b>
          <Trans id="defaultMailFrom" />
        </b>
        .
      </p>
      <p>
        The process requires correspondence with your agency&apos;s IT team, and
        is manual at the moment, so please follow the steps below.
      </p>
      <p>
        <b>How to proceed</b>:
        <ol>
          <li>Fill in request form on FormSG</li>
          <li>Wait for us to contact you within 5 working days</li>
        </ol>
      </p>
      <div className={styles.requestButton}>
        <OutboundLink
          eventLabel={i18n._(LINKS.customDomainRequestUrl)}
          to={i18n._(LINKS.customDomainRequestUrl)}
          target="_blank"
        >
          <PrimaryButton className={styles.darkBlueButton}>
            Fill in request form <i className="bx bx-right-arrow-alt"></i>
          </PrimaryButton>
        </OutboundLink>
      </div>
    </div>
  )
}

export default CustomDomain
