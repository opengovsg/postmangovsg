import React, { useContext } from 'react'
import { OutboundLink } from 'react-ga'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import cx from 'classnames'
import { Trans } from '@lingui/macro'
import { LINKS } from 'config'
import { i18n } from 'locales'

import { StepHeader } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { AuthContext } from 'contexts/auth.context'
import styles from './CustomFromAddress.module.scss'
import VerifyCustomFromAddressModal from '../verify-custom-from-address-modal'
import UpdateCustomFromAddressModal from '../update-custom-from-address-modal'

const CustomFromAddress = ({
  customFromAddresses,
  onSuccess,
}: {
  customFromAddresses: string[]
  onSuccess: Function
}) => {
  const modalContext = useContext(ModalContext)
  const { email } = useContext(AuthContext)
  const title = 'From Address'

  async function onVerifyFromAddressClicked(label: string) {
    sendUserEvent(GA_USER_EVENTS.ADD_FROM_ADDRESS)
    modalContext.setModalContent(
      <VerifyCustomFromAddressModal
        label={label}
        onSuccess={onSuccess}
      ></VerifyCustomFromAddressModal>
    )
  }

  async function onUpdateDisplayNameClicked(label: string) {
    sendUserEvent(GA_USER_EVENTS.UPDATE_FROM_ADDRESS)
    modalContext.setModalContent(
      <UpdateCustomFromAddressModal
        label={label}
        onSuccess={onSuccess}
      ></UpdateCustomFromAddressModal>
    )
  }

  function renderFromAddresses() {
    function isLastUpdateButton(i: number) {
      return i >= customFromAddresses.length - 1
    }
    return (
      <>
        <StepHeader title={title}>
          <p>You can now send emails from the following email addresses: </p>
        </StepHeader>
        <table className={styles.credTable}>
          <tbody>
            <tr>
              <th className="lg">Label</th>
              <th></th>
            </tr>
            {customFromAddresses.map((label: string, idx: number) => (
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

                  <i
                    className={cx(
                      'bx',
                      'bx-pencil',
                      styles.icon,
                      styles.verifyButton,
                      isLastUpdateButton(idx) && styles.disabled
                    )}
                    onClick={() =>
                      !isLastUpdateButton(idx) &&
                      onUpdateDisplayNameClicked(label)
                    }
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
        <StepHeader title={title}>
          <p>
            You can now add your email address <b>{email}</b> as the From
            Address. Recipients will receive emails from this address, instead
            of the default{' '}
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
        </StepHeader>

        <div className={styles.actionButtons}>
          <OutboundLink
            eventLabel={i18n._(LINKS.customFromAddressRequestUrl)}
            to={i18n._(LINKS.customFromAddressRequestUrl)}
            target="_blank"
          >
            <button className={styles.request}>
              Fill in request form <i className="bx bx-right-arrow-alt"></i>
            </button>
          </OutboundLink>
          <button
            className={styles.status}
            onClick={() => onVerifyFromAddressClicked(email)}
          >
            Check verification status <i className="bx bx-refresh"></i>
          </button>
        </div>
      </>
    )
  }
  return (
    <div className={styles.fromAddressContainer}>
      {customFromAddresses.length > 1
        ? renderFromAddresses()
        : renderRequestForm()}
    </div>
  )
}

export default CustomFromAddress
