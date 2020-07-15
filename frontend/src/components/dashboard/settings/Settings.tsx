import React, { useContext, useState, useEffect } from 'react'
import cx from 'classnames'
import { Redirect, Route, Switch } from 'react-router-dom'

import { ModalContext } from 'contexts/modal.context'
import { SideNav, TitleBar } from 'components/common'
import { UserCredential, getUserSettings } from 'services/settings.service'
import { ChannelType, channelIcons } from 'classes'

import ApiKey from './api-key'
import Credentials from './credentials'
import AddCredentialModal from './add-credential-modal'
import AddApiKeyModal from './add-api-key-modal'
import CredentialsImage from 'assets/img/credentials.svg'
import styles from './Settings.module.scss'

const SETTINGS_LINKS = [
  {
    label: 'API Keys',
    location: '/settings/api',
    icon: 'bx-key',
  },
  {
    label: 'SMS',
    location: '/settings/sms',
    icon: channelIcons[ChannelType.SMS],
  },
  {
    label: 'Telegram',
    location: '/settings/telegram',
    icon: channelIcons[ChannelType.Telegram],
  },
]

const Settings = () => {
  const modalContext = useContext(ModalContext)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [creds, setCreds] = useState([] as UserCredential[])

  useEffect(() => {
    fetchUserSettings()
  }, [])

  function onAddCredentialClicked() {
    modalContext.setModalContent(
      <AddCredentialModal
        credType={null}
        onSuccess={fetchUserSettings}
      ></AddCredentialModal>
    )
  }

  function onAddApiKeyClicked() {
    modalContext.setModalContent(
      <AddApiKeyModal onSuccess={fetchUserSettings} />
    )
  }

  async function fetchUserSettings() {
    const { hasApiKey, creds } = await getUserSettings()
    setCreds(creds)
    setHasApiKey(hasApiKey)
  }

  function renderEmptySettings() {
    return (
      <div className={styles.content}>
        <div className={styles.emptySettings}>
          <img
            className={styles.image}
            src={CredentialsImage}
            alt="Empty dashboard graphic"
          />
          <h2>There&apos;s nothing to show yet!</h2>
          <h5>
            But here&apos;s what you can do. Start adding credentials or
            generate API keys.
          </h5>
          <div className={styles.emptyActions}>
            <button onClick={onAddCredentialClicked}>
              Add credentials
              <i className={cx('bx', 'bx-spreadsheet')}></i>
            </button>
            <button onClick={onAddApiKeyClicked}>
              Generate API key
              <i className={cx('bx', 'bx-key')}></i>
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div className={styles.settingsContainer}>
        <SideNav links={SETTINGS_LINKS} />
        <div className={styles.detailsContainer}>
          <Switch>
            <Route exact path="/settings/api">
              <ApiKey hasApiKey={hasApiKey} />
            </Route>
            <Route exact path="/settings/sms">
              <Credentials
                credType={ChannelType.SMS}
                title="Twilio Credentials"
                creds={creds}
                refresh={fetchUserSettings}
              />
            </Route>
            <Route exact path="/settings/telegram">
              <Credentials
                credType={ChannelType.Telegram}
                title="Telegram Credentials"
                creds={creds}
                refresh={fetchUserSettings}
              />
            </Route>
            <Redirect to="/settings/api" />
          </Switch>
        </div>
      </div>
    )
  }

  return (
    <>
      <TitleBar title="Settings"> </TitleBar>
      {!hasApiKey && creds.length < 1
        ? renderEmptySettings()
        : renderSettings()}
    </>
  )
}

export default Settings
