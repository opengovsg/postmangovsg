import React from 'react'
import ApiKey from 'components/dashboard/settings/api-key'
import styles from './AddApiKeyModal.module.scss'

const AddApiKeyModal = ({ onSuccess }: { onSuccess: Function }) => {
  return (
    <div className={styles.container}>
      <ApiKey hasApiKey={false} onGenerate={onSuccess} />
    </div>
  )
}

export default AddApiKeyModal
