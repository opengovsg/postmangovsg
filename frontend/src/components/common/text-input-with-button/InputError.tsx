import React from 'react'
import styles from './TextInputWithButton.module.scss'

type Props = {
  errorMessage: string | null
}

const InputError: React.FC<Props> = (props) => {
  return <div className={styles.errorMessage}>{props.errorMessage}</div>
}

export default InputError
