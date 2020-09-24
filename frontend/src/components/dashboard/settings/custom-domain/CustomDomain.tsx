import React, { useEffect, useState, useContext } from 'react'
import { OutboundLink } from 'react-ga'
import cx from 'classnames'
import { Trans } from '@lingui/macro'
import { LINKS } from 'config'
import { i18n } from 'locales'

import { getCustomFromAddresses } from 'services/settings.service'

import { ModalContext } from 'contexts/modal.context'
import { PrimaryButton } from 'components/common'
import styles from './CustomDomain.module.scss'
import VerifyCustomDomainModal from '../verify-custom-domain-modal'

const CustomDomain = () => {
  const [customFromAddresses, setCustomFromAddresses] = useState([] as string[])
  const modalContext = useContext(ModalContext)
  const title = 'From Address'

  async function onVerifyFromAddressClicked(label: string) {
    modalContext.setModalContent(
      <VerifyCustomDomainModal label={label}></VerifyCustomDomainModal>
    )
  }

  async function populateFromAddresses() {
    const fromAddresses = await getCustomFromAddresses()
    setCustomFromAddresses(fromAddresses)
  }

  // Get custom from addresses
  useEffect(() => {
    populateFromAddresses()
  }, [])

  function renderFromAddresses() {
    return (
      <>
        <p>You can now send emails from the following email addresses: </p>
        <table className={styles.credTable}>
          <tbody>
            <tr>
              <th className="lg">Label</th>
              <th></th>
            </tr>
            {customFromAddresses.map((label: string) => (
              <tr key={label}>
                <td className="lg">{label}</td>
                <td className={cx('sm', styles.actionColumn)}>
                  <i
                    className={cx(
                      'bx',
                      'bx-list-check',
                      styles.icon,
                      styles.verifyButton
                    )}
                    onClick={() => onVerifyFromAddressClicked(label)}
                  ></i>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  }
  function renderRequestForm() {
    return (
      <>
        <p>
          You can now add your email address as the From Address. Recipients
          will receive emails from this address, instead of the default{' '}
          <b>
            <Trans id="defaultMailFrom" />
          </b>
          .
        </p>
        <p>
          The process requires correspondence with your agency&apos;s IT team,
          and is manual at the moment, so please follow the steps below.
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
      </>
    )
  }
  return (
    <div className={styles.customDomainContainer}>
      <div>
        <h2>{title}</h2>
      </div>
      {customFromAddresses.length === 0
        ? renderRequestForm()
        : renderFromAddresses()}
    </div>
  )
}

export default CustomDomain
