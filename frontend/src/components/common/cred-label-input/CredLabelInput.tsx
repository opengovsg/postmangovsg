import React from 'react'

import TextInput from '../text-input'

const CredLabelInput = ({ value, onChange }: { value: string; onChange: (newValue: string) => any }) => {

  function onLabelChange(value: string) {
    if (value) {
      const converted = value.toLowerCase().replace(/[\s-]+/g, '-').replace(/[^a-z0-9-]+/g, '')
      onChange(converted)
    } else {
      onChange('')
    }
  }

  return (
    <>
      <h5>Credential Name</h5>
      <TextInput
        placeholder="Enter a name (e.g. default-cred-1)"
        value={value}
        maxLength="50"
        onChange={onLabelChange}
      />
    </>
  )
}

export default CredLabelInput
