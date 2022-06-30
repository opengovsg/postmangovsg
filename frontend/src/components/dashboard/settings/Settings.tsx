import cx from 'classnames'

import { useContext, useState, useEffect } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'

import styles from './Settings.module.scss'
import AddApiKeyModal from './add-api-key-modal'
import AddCredentialModal from './add-credential-modal'
import ApiKey from './api-key'
import Credentials from './credentials'
import CustomFromAddress from './custom-from-address'

import CredentialsImage from 'assets/img/credentials.svg'
import { ChannelType, channelIcons } from 'classes'
import { SideNav, TitleBar } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import type { UserCredential } from 'services/settings.service'
import {
  getUserSettings,
  getCustomFromAddresses,
} from 'services/settings.service'

const SETTINGS_LINKS = [
  {
    label: 'API Keys',
    location: '/settings/api',
    icon: 'bx-key',
  },
  {
    label: 'Email',
    location: '/settings/email',
    icon: channelIcons[ChannelType.Email],
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
  const [hasCustomFromAddresses, setHasCustomFromAddresses] = useState(false)
  const [customFromAddresses, setCustomFromAddresses] = useState([] as string[])
  const [creds, setCreds] = useState([] as UserCredential[])

  useEffect(() => {
    fetchUserSettings()
    fetchCustomFromAddresses()
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

  async function fetchCustomFromAddresses() {
    const customFromAddresses = await getCustomFromAddresses()
    setCustomFromAddresses(customFromAddresses)
    setHasCustomFromAddresses(customFromAddresses.length > 1)
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
            <Route exact path="/settings/email">
              <CustomFromAddress
                customFromAddresses={customFromAddresses}
                onSuccess={fetchCustomFromAddresses}
              />
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
      {!hasApiKey && creds.length < 1 && !hasCustomFromAddresses
        ? renderEmptySettings()
        : renderSettings()}
    </>
  )
}

export default Settings
