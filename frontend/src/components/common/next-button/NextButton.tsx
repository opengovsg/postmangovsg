import { PrimaryButton } from 'components/common'

import type { ReactElement } from 'react'

const NextButton = ({
  onClick,
  disabled,
  loadingPlaceholder,
}: {
  onClick: (...args: any[]) => void | Promise<void>
  disabled?: boolean
  loadingPlaceholder?: string | ReactElement
}) => {
  return (
    <div className="progress-button">
      <PrimaryButton
        disabled={disabled}
        onClick={onClick}
        loadingPlaceholder={loadingPlaceholder}
      >
        Next <i className="bx bx-right-arrow-alt"></i>
      </PrimaryButton>
    </div>
  )
}

export default NextButton
