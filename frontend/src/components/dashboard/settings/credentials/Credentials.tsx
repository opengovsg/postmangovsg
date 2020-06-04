import React, { useContext } from 'react'
import cx from 'classnames'

import { PrimaryButton, ConfirmModal } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { UserCredential, deleteCredential } from 'services/settings.service'
import { channelIcons } from 'classes'

import AddCredentialModal from '../add-credential-modal'
import EmptyCredentialsImage from 'assets/img/credentials.svg'
import styles from './Credentials.module.scss'

const Credentials = ({
  creds,
  refresh,
}: {
  creds: UserCredential[]
  refresh: Function
}) => {
  const modalContext = useContext(ModalContext)

  function onAddCredentialClicked() {
    modalContext.setModalContent(
      <AddCredentialModal
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
            <td className="xs">
              <i className={cx('bx', styles.icon, channelIcons[type])}></i>
            </td>
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
        <h2>Credentials</h2>
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
              <th className="xs">Mode</th>
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
