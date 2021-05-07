import cx from 'classnames'

import styles from './ProtectedPreview.module.scss'

import appLogo from 'assets/img/brand/app-logo-grey.svg'

/**
 * For breaking changes to styles, a new css class must be
 * created in ProtectedPreview.module.scss and stored as a new
 * column in protected_messages table in the db. This class version
 * will be fetched together with the payload and dynamically rendered.
 */
const ProtectedPreview = ({
  html,
  style = 'style1',
}: {
  html: string
  style?: string
}) => {
  return (
    <div className={styles.container}>
      <div
        className={cx(styles.preview, styles[style])}
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
      <div className={styles.footer}>
        <span className={styles.caption}>Delivered by</span>
        <img src={appLogo} alt="Postman logo" />
      </div>
    </div>
  )
}

export default ProtectedPreview
