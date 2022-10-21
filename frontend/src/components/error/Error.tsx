import { useNavigate } from 'react-router-dom'

import styles from './Error.module.scss'

import heroImg from 'assets/img/not-found.png'
import { PrimaryButton, TextButton } from 'components/common'

const Error = () => {
  const navigate = useNavigate()

  return (
    <div className={styles.rootContainer}>
      <img src={heroImg} className={styles.heroImg} alt="Hero" />
      <h2 className={styles.title}>Page Not Found!</h2>
      <p className={styles.description}>
        The link you followed may be broken, or the page may not exist.
      </p>
      <span className={styles.actions}>
        <PrimaryButton className={styles.action} onClick={() => navigate(-1)}>
          Go back to previous page
        </PrimaryButton>
        <TextButton
          className={styles.action}
          onClick={() => navigate('/campaigns')}
        >
          Go to dashboard
        </TextButton>
      </span>
    </div>
  )
}

export default Error
