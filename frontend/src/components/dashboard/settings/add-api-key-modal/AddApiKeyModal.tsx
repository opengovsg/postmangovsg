import { useContext } from 'react'

import { CopyModal } from '../api-key/CopyModal'

import styles from './AddApiKeyModal.module.scss'

import { CreateUpdateModal } from 'components/dashboard/settings/api-key/CreateUpdateModal'
import { ModalContext } from 'contexts/modal.context'
import { ApiKey } from 'services/api-key.service'

const AddApiKeyModal = ({ onSuccess }: { onSuccess: () => void }) => {
  const modalContext = useContext(ModalContext)
  return (
    <div className={styles.container}>
      <CreateUpdateModal
        onSuccess={(apiKey: ApiKey) => {
          modalContext.setModalContent(<CopyModal apiKey={apiKey} />)
          modalContext.setBeforeClose(onSuccess)
        }}
      />
    </div>
  )
}

export default AddApiKeyModal
