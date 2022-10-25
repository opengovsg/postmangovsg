import styles from './FeedbackModal.module.scss'

const FeedbackModal = () => {
  return (
    <>
      <div className={styles.disclaimer}>
        If the form below is not loaded, you can also fill it in at{' '}
        <a href="https://form.gov.sg/6344cf65bb320400137b59dc">here</a>.
      </div>
      <iframe
        className={styles.frame}
        id="iframe"
        src="https://form.gov.sg/6344cf65bb320400137b59dc"
      ></iframe>
      <div className={styles.footer}>
        Powered by{' '}
        <a className={styles.url} href="https://form.gov.sg">
          FormSG
        </a>
      </div>
    </>
  )
}
export default FeedbackModal
