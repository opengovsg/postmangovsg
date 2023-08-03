import { ActionButton } from 'components/common'

interface ResendButtonProps {
  onClick: () => void
}

export const ResendButton = ({ onClick }: ResendButtonProps) => {
  return (
    <ActionButton onClick={onClick}>
      <span>RESEND</span>
    </ActionButton>
  )
}
