import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import cx from 'classnames'

import { POSTMAN_GUIDE_URL } from 'config'

import styles from './NavBar.module.scss'

const NavBar = () => {

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className={styles.navBar}>
      <div className={styles.navBrand}>
        <NavLink className={styles.title} to="/campaigns">POSTMAN</NavLink>
        <a className={styles.burgerButton} onClick={() => setMenuOpen(!menuOpen)}>
          <span className={cx(styles.burger, { [styles.isActive]: menuOpen })}></span>
        </a>
      </div>
      <div className={cx(styles.navbarLinks, { [styles.isActive]: menuOpen })}>
        <NavLink className={styles.link} activeClassName={styles.active} to="/campaigns">Campaigns</NavLink>
        <NavLink className={styles.link} activeClassName={styles.active} to="/create">Create</NavLink>
        <a className={styles.link} href={POSTMAN_GUIDE_URL}>Guide</a>
        <NavLink className={styles.link} activeClassName={styles.active} to="/settings">Settings</NavLink>

        <div className={styles.separator}></div>

        <span className={`${styles.active} ${styles.link}`}>postman@open.gov.sg</span>
        <a className={`${styles.active} ${styles.link}`} onClick={() => alert('logout')}>Sign out</a>
      </div>
    </nav >
  )
}

export default NavBar
