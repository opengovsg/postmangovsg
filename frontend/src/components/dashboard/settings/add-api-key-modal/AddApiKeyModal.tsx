import styles from './AddApiKeyModal.module.scss'

import ApiKey from 'components/dashboard/settings/api-key'

const AddApiKeyModal = ({ onSuccess }: { onSuccess: () => void }) => {
  return (
    <div className={styles.container}>
      <ApiKey hasApiKey={false} onGenerate={onSuccess} />
    </div>
  )
}

export default AddApiKeyModal
