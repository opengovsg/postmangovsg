import React from 'react'

import { PrimaryButton } from 'components/common'
import styles from './NextButton.module.scss'

const NextButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: (...args: any[]) => void | Promise<void>
}) => {
  return (
    <div className={styles.nextButton}>
      <PrimaryButton disabled={disabled} onClick={onClick}>
        Next <i className="bx bx-right-arrow-alt"></i>
      </PrimaryButton>
    </div>
  )
}

export default NextButton
