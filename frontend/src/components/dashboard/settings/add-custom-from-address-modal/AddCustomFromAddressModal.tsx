import CustomFromAddress from 'components/dashboard/settings/custom-from-address'

import styles from './AddCustomFromAddressModal.module.scss'

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
