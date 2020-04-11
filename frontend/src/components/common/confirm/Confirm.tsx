import React from 'react'
import cx from 'classnames'

import { PrimaryButton } from 'components/common'
import ModalImage from 'assets/img/modal.png'
import styles from './Confirm.module.scss'

const Confirm = () => {

  return (
    <div className={styles.confirm}>
      <div className={styles.modalImg}>
        <img src={ModalImage} alt="Modal graphic"></img>
      </div>
      <h2 className={styles.title}>Are you absolutely sure?</h2>
      <h4 className={styles.subtitle}>Sending out a campaign is irreversible.</h4>
      <PrimaryButton className={styles.button}>
        <p>Confirm send now</p>
        <i className={cx('bx', styles.icon, 'send')}></i>
        {/* <FontAwesomeIcon className={cx(styles.icon, styles.send)} icon={faPaperPlane}></FontAwesomeIcon> */}
      </PrimaryButton>
    </div>
  )
}

export default Confirm