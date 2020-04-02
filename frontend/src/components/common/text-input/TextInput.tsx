import React from 'react'

const TextInput = (props: any) => {
  const { className, ...otherProps } = props

  return (
    <input className={`input is-primary is-rounded ${className}`} {...otherProps} />
  )
}

export default TextInput