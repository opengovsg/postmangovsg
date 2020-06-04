import React, { useState, useEffect } from 'react'

import { TitleBar } from 'components/common'
import { UserCredential, getUserSettings } from 'services/settings.service'

import Credentials from './credentials'
import ApiKey from './api-key'

import styles from './Settings.module.scss'

const Settings = () => {
  const [hasApiKey, setHasApiKey] = useState(false)
  const [creds, setCreds] = useState([] as UserCredential[])

  useEffect(() => {
    fetchUserSettings()
  }, [])

  async function fetchUserSettings() {
    const { hasApiKey, creds } = await getUserSettings()
    setCreds(creds)
    setHasApiKey(hasApiKey)
  }

  return (
    <>
      <TitleBar title="Settings"> </TitleBar>
      <div className={styles.container}>
        <ApiKey hasApiKey={hasApiKey} />
        <div className="separator"></div>
        <Credentials creds={creds} refresh={fetchUserSettings} />
      </div>
    </>
  )
}

export default Settings
