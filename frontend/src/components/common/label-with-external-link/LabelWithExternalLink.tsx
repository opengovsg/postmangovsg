import { OutboundLink } from 'react-ga'

import styles from './LabelWithExternalLink.module.scss'

const LabelWithExternalLink = ({
  label,
  link,
  htmlFor,
}: {
  label: string
  link?: string
  htmlFor?: string
}) => {
  return (
    <div className={styles.label}>
      <label htmlFor={htmlFor}>{label}</label>
      {link && (
        <OutboundLink
          className={styles.link}
          eventLabel={link}
          to={link}
          target="_blank"
        >
          <i className="bx bx-link-external" />
        </OutboundLink>
      )}
    </div>
  )
}

export default LabelWithExternalLink
