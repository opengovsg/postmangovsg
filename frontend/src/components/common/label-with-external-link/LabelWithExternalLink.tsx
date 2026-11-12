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
        <a
          className={styles.link}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="bx bx-link-external" />
        </a>
      )}
    </div>
  )
}

export default LabelWithExternalLink
