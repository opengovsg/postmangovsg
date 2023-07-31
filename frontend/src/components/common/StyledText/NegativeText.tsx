import { ReactNode } from 'react'

interface NegativeTextProps {
  children?: ReactNode
}

const negativeTextStyle = { color: '#64707D' }

export const NegativeText = ({ children }: NegativeTextProps) => {
  return <span style={negativeTextStyle}>{children}</span>
}
