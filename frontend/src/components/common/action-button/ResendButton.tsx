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
  return (
    <div style={resendButtonStyle}>
      <ActionButton onClick={onClick} disabled={disabled}>
        <span>RESEND</span>
      </ActionButton>
    </div>
  )
}
