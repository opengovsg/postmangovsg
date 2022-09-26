import { InfoBlock } from 'components/common'
import styles from 'components/dashboard/create/Create.module.scss'

export const ManagedListInfoBlock = () => {
  return (
    <InfoBlock className={styles.notice}>
      We&apos;re working on a new feature! If you would like to manage your
      recipient list on Postman directly, let us know by{' '}
      <a href="https://go.gov.sg/postman-list" target="_blank" rel="noreferrer">
        indicating your interest here
      </a>
      !
    </InfoBlock>
  )
}
