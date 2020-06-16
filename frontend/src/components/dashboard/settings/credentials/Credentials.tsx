import React, { useContext } from 'react'
import cx from 'classnames'

import { ChannelType } from 'classes'
import { PrimaryButton, ConfirmModal } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { UserCredential, deleteCredential } from 'services/settings.service'
import { channelIcons } from 'classes'

import AddCredentialModal from '../add-credential-modal'
import EmptyCredentialsImage from 'assets/img/credentials.svg'
import styles from './Credentials.module.scss'

const Credentials = ({
  creds,
  credType,
  refresh,
  title,
}: {
  creds: UserCredential[]
  credType: ChannelType
  refresh: Function
  title: string
}) => {
  const modalContext = useContext(ModalContext)
  creds = creds.filter((cred: UserCredential) => cred.type === credType)

  function onAddCredentialClicked() {
    modalContext.setModalContent(
      <AddCredentialModal
        credType={credType}
        labels={creds.map((c) => c.label)}
        onSuccess={refresh}
      ></AddCredentialModal>
    )
  }

  async function onDeleteCredClicked(label: string) {
    modalContext.setModalContent(
      <ConfirmModal
        title={`Confirm deletion of ${label}?`}
        subtitle="This cannot be undone."
        buttonText="Delete"
        buttonIcon="bx-trash"
        destructive={true}
        onConfirm={() => onDeleteConfirm(label)}
      />
    )
  }

  async function onDeleteConfirm(label: string) {
    await deleteCredential(label)
    refresh()
  }

  function renderCredentials() {
    return (
      <>
        {creds.map(({ label, type }) => (
          <tr key={label}>
            <td className="md">{label}</td>
            <td className={cx('sm', styles.actionColumn)}>
              <i
                className={cx(
                  'bx',
                  'bx-trash',
                  styles.icon,
                  styles.deleteButton
                )}
                onClick={() => onDeleteCredClicked(label)}
              ></i>
            </td>
          </tr>
        ))}
      </>
    )
  }

  return (
    <>
      <div className={styles.credHeader}>
        <h2>{title}</h2>
        <PrimaryButton
          className={styles.blueButton}
          onClick={onAddCredentialClicked}
        >
          Add credentials
          <i className={'bx bx-plus'}></i>
        </PrimaryButton>
      </div>
      {creds.length ? (
        <table className={styles.credTable}>
          <tbody>
            <tr>
              <th className="md">Label</th>
              <th className={cx('sm', styles.actionColumn)}></th>
            </tr>
            {renderCredentials()}
          </tbody>
        </table>
      ) : (
        <div className={styles.emptyCredentials}>
          <img src={EmptyCredentialsImage} />
          <h3>There’s nothing to show yet!</h3>
          <p>
            But here’s what you can do. Start adding credentials by clicking the
            button above.
          </p>
        </div>
      )}
    </>
  )
}

export default Credentials
