import { useState } from 'react'

import styles from './CopyModal.module.scss'

import successImg from 'assets/img/success.png'
import { InfoBlock, TextInputWithButton } from 'components/common'
import { ApiKey } from 'services/api-key.service'

export const CopyModal = ({ apiKey }: { apiKey: ApiKey }) => {
  const [hasCopied, setHasCopied] = useState<boolean>(false)
  return (
    <div className={styles.modal}>
      <div className={styles.modalImg}>
        <img src={successImg} alt="Success image" />
      </div>
      <h2 className={styles.title}>
        Your API Key has been successfully created
      </h2>
      <div className={styles.copier}>
        <p>{apiKey.label}</p>
        <TextInputWithButton
          className={styles.greenButton}
          value={apiKey.key}
          onChange={() => {
            return
          }}
          onClick={() => {
            void navigator.clipboard.writeText(apiKey.key as string)
            setHasCopied(true)
            setTimeout(() => setHasCopied(false), 3000)
          }}
          buttonLabel={
            <>
              {hasCopied ? 'Copied' : 'Copy'} API key
              <i className={`bx ${hasCopied ? 'bx-check' : 'bx-copy'}`}></i>
            </>
          }
        />
        <InfoBlock className={styles.infoBlock}>
          Please save a copy your API key immediately as this will only be shown
          only once. If you leave or refresh this page, the key will already be
          hidden.
        </InfoBlock>
      </div>
    </div>
  )
}
