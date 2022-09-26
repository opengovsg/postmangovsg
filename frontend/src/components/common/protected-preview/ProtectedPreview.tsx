import styles from './ProtectedPreview.module.scss'

/**
 * For breaking changes to styles, a new css class must be
 * created in ProtectedPreview.module.scss and stored as a new
 * column in protected_messages table in the db. This class version
 * will be fetched together with the payload and dynamically rendered.
 */
const ProtectedPreview = ({ html }: { html: string; style?: string }) => {
  return (
    <div className={styles.container}>
      <div
        className={styles.preview}
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
    </div>
  )
}

export default ProtectedPreview
