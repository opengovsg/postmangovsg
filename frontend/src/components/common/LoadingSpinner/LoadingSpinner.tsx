import styles from './LoadingSpinner.module.scss'

export const LoadingSpinner = () => {
  return (
    <div className={styles.spinner}>
      <i className="bx bx-loader-alt bx-spin"></i>
    </div>
  )
}
