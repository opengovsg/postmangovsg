import React from 'react'
import { NavLink } from 'react-router-dom'
import cx from 'classnames'
import styles from './SideNav.module.scss'

const NavItem = ({
  label,
  location,
  icon,
}: {
  label: string
  location: string
  icon: string
}) => {
  return (
    <NavLink
      to={location}
      activeClassName={styles.active}
      className={styles.navItem}
    >
      <span>
        <i className={cx('bx', styles.icon, icon)}></i>
        {label}
      </span>
      <i className={cx('bx', styles.icon, 'bx-chevron-right')}></i>
    </NavLink>
  )
}

const SideNav = ({
  links,
}: {
  links: Array<{ label: string; location: string; icon: string }>
}) => {
  return (
    <div className={styles.sideNav}>
      {links.map(
        (
          link: { label: string; location: string; icon: string },
          index: number
        ) => (
          <NavItem key={index} {...link} />
        )
      )}
    </div>
  )
}

export default SideNav
