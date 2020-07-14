import React from 'react'

import { PrimaryButton } from 'components/common'

const NextButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: (...args: any[]) => void | Promise<void>
}) => {
  return (
    <div className="progress-button">
      <PrimaryButton disabled={disabled} onClick={onClick}>
        Next <i className="bx bx-right-arrow-alt"></i>
      </PrimaryButton>
    </div>
  )
}

export default NextButton
