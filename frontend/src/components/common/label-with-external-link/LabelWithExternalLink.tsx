import React from 'react'

import { OutboundLink } from 'react-ga'
import styles from './LabelWithExternalLink.module.scss'

const LabelWithExternalLink = ({
  label,
  link,
}: {
  label: string
  link: string
}) => {
  return (
    <>
      <h5 className={styles.label}>{label}</h5>
      <OutboundLink
        className={styles.link}
        eventLabel={link}
        to={link}
        target="_blank"
      >
        <i className="bx bx-link-external" />
      </OutboundLink>
    </>
  )
}

export default LabelWithExternalLink
