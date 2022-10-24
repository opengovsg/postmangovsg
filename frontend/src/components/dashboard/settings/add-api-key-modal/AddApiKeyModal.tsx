import ApiKey from 'components/dashboard/settings/api-key'

import styles from './AddApiKeyModal.module.scss'

const AddApiKeyModal = ({ onSuccess }: { onSuccess: () => void }) => {
  return (
    <div className={styles.container}>
      <ApiKey hasApiKey={false} onGenerate={onSuccess} />
    </div>
  )
}

export default AddApiKeyModal
