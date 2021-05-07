import styles from './AddCustomFromAddressModal.module.scss'

import CustomFromAddress from 'components/dashboard/settings/custom-from-address'

const AddCustomFromAddressModal = ({
  customFromAddresses,
  onSuccess,
}: {
  customFromAddresses: string[]
  onSuccess: () => void
}) => {
  return (
    <div className={styles.container}>
      <CustomFromAddress
        customFromAddresses={customFromAddresses}
        onSuccess={onSuccess}
      />
    </div>
  )
}

export default AddCustomFromAddressModal
