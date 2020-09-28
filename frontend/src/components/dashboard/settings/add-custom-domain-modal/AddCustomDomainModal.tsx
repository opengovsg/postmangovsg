import React from 'react'
import CustomDomain from 'components/dashboard/settings/custom-domain'
import styles from './AddCustomDomainModal.module.scss'

const AddCustomDomainModal = ({ onSuccess }: { onSuccess: Function }) => {
  return (
    <div className={styles.container}>
      <CustomDomain onSuccess={onSuccess} />
    </div>
  )
}

export default AddCustomDomainModal
