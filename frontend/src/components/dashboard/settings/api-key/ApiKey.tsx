import cx from 'classnames'

import moment from 'moment'
import { useState, useContext, useEffect } from 'react'

import type { FunctionComponent } from 'react'

import { OutboundLink } from 'react-ga'

import styles from './ApiKey.module.scss'

import { CopyModal } from './CopyModal'
import { CreateUpdateModal } from './CreateUpdateModal'

import { ConfirmModal, PrimaryButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import {
  ApiKey as ApiKeyType,
  deleteApiKey,
  listApiKeys,
} from 'services/api-key.service'

const ApiKey: FunctionComponent = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyType[]>([])
  function addApiKey(key: ApiKeyType) {
    setApiKeys([key, ...apiKeys])
  }
  function updateApiKey(key: ApiKeyType) {
    const index = apiKeys.findIndex((k) => k.id === key.id)
    if (index === -1) return
    setApiKeys([...apiKeys.slice(0, index), key, ...apiKeys.slice(index + 1)])
  }
  function removeApiKey(id: string) {
    setApiKeys(apiKeys.filter((k) => k.id !== id))
  }

  const [isPageLoading, setIsPageLoading] = useState<boolean>(false)

  useEffect(() => {
    void (async () => {
      setIsPageLoading(true)
      setApiKeys(await listApiKeys())
      setIsPageLoading(false)
    })()
  }, [])

  const modalContext = useContext(ModalContext)

  function openCopyModal(apiKey: ApiKeyType) {
    modalContext.setModalContent(<CopyModal apiKey={apiKey} />)
  }

  function openGenerateModal() {
    modalContext.setModalContent(
      <CreateUpdateModal
        onSuccess={(apiKey: ApiKeyType) => {
          addApiKey(apiKey)
          openCopyModal(apiKey)
        }}
      />
    )
  }
  function openUpdateModal(apiKey: ApiKeyType) {
    modalContext.setModalContent(
      <CreateUpdateModal
        originalApiKey={apiKey}
        onSuccess={(apiKey: ApiKeyType) => {
          updateApiKey(apiKey)
          modalContext.close()
        }}
      />
    )
  }

  function openDeleteModal(keyId: string) {
    const apiKey = apiKeys.find((k) => k.id === keyId)
    if (!apiKey) return
    modalContext.setModalContent(
      <ConfirmModal
        title={`Are you sure you want to delete API key "${apiKey.label}"?`}
        subtitle="Deleting your API key is immediate and irreversible. To ensure a smooth API key rotation, please replace this key with a new API key before deleting."
        onConfirm={() => {
          void deleteApiKey(keyId).then(() => removeApiKey(keyId))
        }}
        onCancel={() => modalContext.close()}
        buttonText="Confirm delete"
        buttonIcon="bx-trash"
        cancelText="Cancel"
        destructive
      />
    )
  }

  return isPageLoading ? (
    <div className={styles.loader}>
      <i className="bx bx-loader-alt bx-spin" />
    </div>
  ) : (
    <>
      <div className={styles.header}>
        <h3>API Key</h3>
        <PrimaryButton
          className={styles.blueButton}
          onClick={openGenerateModal}
        >
          <i className="bx bx-plus"></i>
          Generate API Key
        </PrimaryButton>
      </div>
      <p className={styles.helpText}>
        You can create an API key to access our programmatic email and
        programmatic SMS APIs. For more information, go to our{' '}
        <OutboundLink
          eventLabel="https://go.gov.sg/postman-api"
          to="https://go.gov.sg/postman-api"
          target="_blank"
        >
          API Guide
        </OutboundLink>
        .
      </p>
      {apiKeys.length > 0 && (
        <table className={styles.apiKeyTable}>
          <thead>
            <tr>
              <th className="lg">Key Label</th>
              <th className="sm">Last 5 Digits</th>
              <th className="lg">Contacts</th>
              <th className="sm">Expires At</th>
              <th className="sm"></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((k) => (
              <tr key={k.id}>
                <td className="lg">{k.label}</td>
                <td className="sm">••••• {k.last_five}</td>
                <td className="lg">
                  {k.notification_addresses &&
                    k.notification_addresses.join('\n')}
                </td>
                <td className="sm">
                  {moment(k.valid_until).format('DD MMM YYYY, HH:mm')}
                </td>
                <td className={cx('sm', styles.buttonContainer)}>
                  <button onClick={() => openUpdateModal(k)}>
                    <i className={cx('bx bx-pencil', styles.pencil)} />
                  </button>
                  <button onClick={() => openDeleteModal(k.id)}>
                    <i className={cx('bx bx-trash', styles.trash)} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export default ApiKey
