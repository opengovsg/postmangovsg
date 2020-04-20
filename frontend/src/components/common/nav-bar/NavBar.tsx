import React, { useState, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import cx from 'classnames'

import { ModalContext } from 'contexts/modal.context'
import { POSTMAN_GUIDE_URL } from 'config'
import CreateModal from 'components/dashboard/create-modal'
import { logout } from 'services/auth.service'
import styles from './NavBar.module.scss'
import { AuthContext } from 'contexts/auth.context'

const NavBar = () => {
  const { setAuthenticated } = useContext(AuthContext)
  const modalContext = useContext(ModalContext)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  function handleCreateCampaign() {
    modalContext.setModalContent(
      <CreateModal></CreateModal>
    )
  }

  async function handleLogout() {
    try{
      await logout()
      setAuthenticated(false)
    }catch(err){
      console.error(err)
    }
  }

  function isCreatePath() {
    return /^\/campaigns\/\d+$/.test(location.pathname)
  }

  return (
    <nav className={styles.navBar}>
      <div className={styles.navBrand}>
        <NavLink className={styles.title} to="/campaigns">POSTMAN</NavLink>
        <a className={styles.burgerButton} onClick={() => setMenuOpen(!menuOpen)}>
          <span className={cx(styles.burger, { [styles.isActive]: menuOpen })}></span>
        </a>
      </div>
      <div className={cx(styles.navbarLinks, { [styles.isActive]: menuOpen })}>
        <NavLink className={styles.link} activeClassName={styles.active} exact to="/campaigns">Campaigns</NavLink>
        <a className={cx(styles.link, { [styles.active]: isCreatePath() })} onClick={handleCreateCampaign}>Create</a>
        <a className={styles.link} href={POSTMAN_GUIDE_URL}>Guide</a>
        <NavLink className={styles.link} activeClassName={styles.active} to="/settings">Settings</NavLink>

        <div className={styles.separator}></div>

        <span className={cx(styles.active, styles.link)}>postman@open.gov.sg</span>
        <a className={cx(styles.active, styles.link)} onClick={handleLogout}>Sign out</a>
      </div>
    </nav >
  )
}

export default NavBar
