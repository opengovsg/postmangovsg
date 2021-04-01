import { useHistory, NavLink } from 'react-router-dom'
import cx from 'classnames'
import styles from './SideNav.module.scss'

import { Dropdown } from 'components/common'

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
  const history = useHistory()
  const options = links.map(
    (link: { label: string; location: string; icon: string }) => ({
      label: link.label,
      value: link.location,
    })
  )

  function onSelectLink(location: string) {
    history.push(location)
  }

  return (
    <>
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
      <div className={styles.sideNavDropdown}>
        <label>Navigate to:</label>
        <Dropdown onSelect={onSelectLink} options={options} />
        <div className="separator"></div>
      </div>
    </>
  )
}

export default SideNav
