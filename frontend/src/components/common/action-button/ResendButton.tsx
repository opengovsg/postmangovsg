import Tooltip from '../tooltip/Tooltip'

import { ActionButton } from 'components/common'

interface ResendButtonProps {
  onClick: () => void
  disabled?: boolean
}

const resendButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}

export const ResendButton = ({ onClick, disabled }: ResendButtonProps) => {
  const renderTooltip = () => {
    return (
      <div style={{ visibility: disabled ? 'visible' : 'hidden' }}>
        <Tooltip text="Unable to resend passcode creation because the initial message has not reached the recipient's phone. Contact us if this problem persists.">
          <i className="bx bxs-help-circle"></i>
        </Tooltip>
      </div>
    )
  }

  return (
    <div style={resendButtonStyle}>
      {renderTooltip()}
      <ActionButton onClick={onClick} disabled={disabled}>
        <span>RESEND</span>
      </ActionButton>
    </div>
  )
}
