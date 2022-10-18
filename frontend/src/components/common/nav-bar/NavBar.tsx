import { i18n } from '@lingui/core'

import cx from 'classnames'

import { useState, useContext } from 'react'

import { OutboundLink } from 'react-ga'

import { NavLink, useLocation } from 'react-router-dom'

import styles from './NavBar.module.scss'

import AppLogo from 'assets/img/brand/app-logo-reverse.svg'
import { TextButton } from 'components/common'
import CreateModal from 'components/dashboard/create/create-modal'
import { LINKS } from 'config'
import { AuthContext } from 'contexts/auth.context'
import { ModalContext } from 'contexts/modal.context'

import { logout } from 'services/auth.service'

const NavBar = () => {
  const { setAuthenticated, email } = useContext(AuthContext)
  const modalContext = useContext(ModalContext)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  function handleCreateCampaign() {
    modalContext.setModalContent(<CreateModal></CreateModal>)
  }

  async function handleLogout() {
    try {
      await logout()
      setAuthenticated(false)
    } catch (err) {
      console.error(err)
    }
  }

  function isCreatePath() {
    return /^\/campaigns\/\d+$/.test(location.pathname)
  }

  return (
    <nav className={styles.navBar}>
      <div className={styles.navBrand}>
        <a href="/campaigns" className={styles.appLogo}>
          <img src={AppLogo} alt="Postman logo" />
        </a>
        <TextButton
          noUnderline
          className={styles.burgerButton}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span
            className={cx(styles.burger, { [styles.isActive]: menuOpen })}
          ></span>
        </TextButton>
      </div>
      <div className={cx(styles.navbarLinks, { [styles.isActive]: menuOpen })}>
        <NavLink
          className={({ isActive }) =>
            cx(styles.link, isActive ? styles.active : '')
          }
          to="/campaigns"
        >
          Campaigns
        </NavLink>
        <TextButton
          noUnderline
          className={cx(styles.link, { [styles.active]: isCreatePath() })}
          onClick={handleCreateCampaign}
        >
          Create
        </TextButton>
        <OutboundLink
          className={styles.link}
          eventLabel={`Dashboard navbar / ${i18n._(LINKS.guideUrl)}`}
          to={i18n._(LINKS.guideUrl)}
          target="_blank"
        >
          Guide
        </OutboundLink>
        <NavLink
          className={({ isActive }) =>
            cx(styles.link, isActive ? styles.active : '')
          }
          to="/settings"
        >
          Settings
        </NavLink>
        <OutboundLink
          className={styles.link}
          eventLabel={i18n._(LINKS.featureRequestUrl)}
          to={i18n._(LINKS.featureRequestUrl)}
          target="_blank"
        >
          Feature Request
        </OutboundLink>
        <OutboundLink
          className={styles.link}
          eventLabel={i18n._(LINKS.contactUsUrl)}
          to={i18n._(LINKS.contactUsUrl)}
          target="_blank"
        >
          Contact Us
        </OutboundLink>

        <div className={styles.separator}></div>

        <span
          className={cx(
            styles.active,
            styles.link,
            styles.noClick,
            styles.right
          )}
        >
          {email}
        </span>
        <TextButton
          noUnderline
          className={cx(
            styles.active,
            styles.link,
            styles.right,
            styles.iconLink
          )}
          onClick={handleLogout}
        >
          Sign out
          <i className={cx(styles.icon, 'bx bx-log-out-circle')}></i>
        </TextButton>
      </div>
    </nav>
  )
}

export default NavBar
