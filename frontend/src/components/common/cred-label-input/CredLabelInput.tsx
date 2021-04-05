import React from 'react'

import TextInput from '../text-input'
import LabelWithExternalLink from '../label-with-external-link'
import ErrorBlock from '../error-block'

const CredLabelInput = ({
  value,
  onChange,
  labels,
  className,
}: {
  value: string
  onChange: (newValue: string) => any
  labels: string[]
  className?: any
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

  function isValidLabel() {
    return value && !labels.includes(value)
  }

  return (
    <>
      <LabelWithExternalLink
        htmlFor="credentialLabel"
        label="Credential Label"
      />
      <TextInput
        id="credentialLabel"
        className={className}
        placeholder="Enter a label (e.g. default-cred-1)"
        value={value}
        maxLength="50"
        onChange={onLabelChange}
      />
      {value && !isValidLabel() && (
        <ErrorBlock>
          Label already exists. Please use a different one.
        </ErrorBlock>
      )}
    </>
  )
}

export default CredLabelInput
