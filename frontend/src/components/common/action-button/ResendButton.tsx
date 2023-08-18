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
        <Tooltip text="Resend is not applicable to this message template.">
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
