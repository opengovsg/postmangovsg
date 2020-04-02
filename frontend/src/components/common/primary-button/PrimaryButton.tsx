import React from 'react'

const PrimaryButton = (props: any) => {
  const { className, children, ...otherProps } = props
  return (
    <button className={`button is-primary is-rounded ${className}`} {...otherProps}>
      {children}
    </button>
  )
}

export default PrimaryButton