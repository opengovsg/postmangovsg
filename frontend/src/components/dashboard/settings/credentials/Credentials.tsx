import { useContext } from 'react'
import EmptyCredentialsImage from 'assets/img/credentials.svg'
import type { ChannelType } from 'classes'
import cx from 'classnames'
import { ConfirmModal, PrimaryButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import type { UserCredential } from 'services/settings.service'
import { deleteCredential } from 'services/settings.service'

import AddCredentialModal from '../add-credential-modal'
import VerifyCredentialModal from '../verify-credential-modal'

import styles from './Credentials.module.scss'

const Credentials = ({
  creds,
  credType,
  refresh,
  title,
}: {
  creds: UserCredential[]
  credType: ChannelType
  refresh: () => void
  title: string
}) => {
  const modalContext = useContext(ModalContext)
  creds = creds.filter((cred: UserCredential) => cred.type === credType)

  function onAddCredentialClicked() {
    modalContext.setModalContent(
      <AddCredentialModal
        credType={credType}
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

  async function onVerifyCredClicked(label: string, type: ChannelType) {
    modalContext.setModalContent(
      <VerifyCredentialModal
        label={label}
        credType={type}
      ></VerifyCredentialModal>
    )
  }

  function renderCredentials() {
    return (
      <>
        {creds.map(({ label }) => (
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
                onClick={() => onVerifyCredClicked(label, credType)}
              ></i>
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
        <h3>{title}</h3>
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
              <th className="lg">Label</th>
              <th className={cx('sm', styles.actionColumn)}></th>
            </tr>
            {renderCredentials()}
          </tbody>
        </table>
      ) : (
        <div className={styles.emptyCredentials}>
          <img src={EmptyCredentialsImage} alt="" />
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
