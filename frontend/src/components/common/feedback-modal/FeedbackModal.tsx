import styles from './FeedbackModal.module.scss'

const FeedbackModal = ({ url }: { url: string }) => {
  return (
    <>
      <div className={styles.disclaimer}>
        If the form below is not loaded, you can also fill it in{' '}
        <a
          className={styles.disclaimer_url}
          href={url}
          target={'_blank'}
          rel="noreferrer"
        >
          here
        </a>
        .
      </div>
      <iframe className={styles.frame} id="iframe" src={url}></iframe>
      <div className={styles.footer}>
        Powered by{' '}
        <a
          className={styles.url}
          href="https://form.gov.sg"
          target={'_blank'}
          rel="noreferrer"
        >
          FormSG
        </a>
      </div>
    </>
  )
}
export default FeedbackModal
