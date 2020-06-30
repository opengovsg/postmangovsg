import React, { useState, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import cx from 'classnames'
import { OutboundLink } from 'react-ga'

import { ModalContext } from 'contexts/modal.context'
import { GUIDE_URL } from 'config'
import CreateModal from 'components/dashboard/create/create-modal'
import { logout } from 'services/auth.service'
import { AuthContext } from 'contexts/auth.context'

import AppLogo from 'assets/img/brand/app-logo-reverse.svg'
import styles from './NavBar.module.scss'

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
        <a
          className={styles.burgerButton}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span
            className={cx(styles.burger, { [styles.isActive]: menuOpen })}
          ></span>
        </a>
      </div>
      <div className={cx(styles.navbarLinks, { [styles.isActive]: menuOpen })}>
        <NavLink
          className={styles.link}
          activeClassName={styles.active}
          exact
          to="/campaigns"
        >
          Campaigns
        </NavLink>
        <a
          className={cx(styles.link, { [styles.active]: isCreatePath() })}
          onClick={handleCreateCampaign}
        >
          Create
        </a>
        <OutboundLink
          className={styles.link}
          eventLabel={GUIDE_URL}
          to={GUIDE_URL}
          target="_blank"
        >
          Guide
        </OutboundLink>
        <NavLink
          className={styles.link}
          activeClassName={styles.active}
          to="/settings"
        >
          Settings
        </NavLink>

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
        <a
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
        </a>
      </div>
    </nav>
  )
}

export default NavBar
