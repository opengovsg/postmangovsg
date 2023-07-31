import { ReactNode } from 'react'

interface PlainBadgeProps {
  children?: ReactNode
}

const plainBadgeStyle = {
  backgroundColor: '#F5F6FC',
  borderRadius: '8px',
  padding: '4px 8px',
}

export const PlainBadge = ({ children }: PlainBadgeProps) => {
  return <span style={plainBadgeStyle}>{children}</span>
}
