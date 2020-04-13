import React from 'react'

import { TextInput } from 'components/common'
import styles from './Credentials.module.scss'

const Credentials = ({ hasCredentials, credentials }: { hasCredentials: boolean; credentials: Array<object> }) => {
  const dummyCredential = '0'.repeat(30)

  return (
    <div className={styles.container}>
      {
        credentials.map((cred: any ) => (
          <div key={cred.label} className={styles.credential} >
            <h5 className={styles.inputLabel}>{cred.label}</h5>
            {
              hasCredentials
                ? <TextInput className={styles.inputPwd} defaultValue={dummyCredential} type="password" />
                : <TextInput
                  placeholder={`Enter ${cred.label}`}
                  value={cred.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => cred.setValue(e.target.value)}
                />
            }
          </div>
        ))
      }
    </div>
  )
}

export default Credentials