import React from 'react'

import TextInput from '../text-input'
import LabelWithExternalLink from '../label-with-external-link'

const CredLabelInput = ({
  value,
  onChange,
}: {
  value: string
  onChange: (newValue: string) => any
}) => {
  function onLabelChange(value: string) {
    if (value) {
      const converted = value
        .toLowerCase()
        .replace(/[\s-]+/g, '-')
        .replace(/[^a-z0-9-]+/g, '')
      onChange(converted)
    } else {
      onChange('')
    }
  }

  return (
    <>
      <LabelWithExternalLink label="Credential Label" />
      <TextInput
        placeholder="Enter a label (e.g. default-cred-1)"
        value={value}
        maxLength="50"
        onChange={onLabelChange}
      />
    </>
  )
}

export default CredLabelInput
