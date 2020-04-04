import React from 'react'
import { NavLink } from 'react-router-dom'
import { POSTMAN_GUIDE_URL } from 'config'

import styles from './NavBar.module.scss'

const NavBar = () => {
  return (
    <div className={styles.navBar}>
      <div className={styles.left}>
        <NavLink className={styles.title} to="/campaigns">POSTMAN</NavLink>
        <NavLink className={styles.link} activeClassName={styles.active} to="/campaigns">Campaigns</NavLink>
        <NavLink className={styles.link} activeClassName={styles.active} to="/create">Create</NavLink>
        <a className={styles.link} href={POSTMAN_GUIDE_URL}>Guide</a>
        <NavLink className={styles.link} activeClassName={styles.active} to="/settings">Settings</NavLink>
      </div>
      <div className={styles.right}>
        <span className={`${styles.active} ${styles.link}`}>postman@open.gov.sg</span>
        <a className={`${styles.active} ${styles.link}`} onClick={() => alert('logout')}>Sign out</a>
      </div>
    </div>
  )
}

export default NavBar
