import React, { useState } from 'react'

import { TextArea, PrimaryButton } from 'components/common'

const SMSTemplate = ({ body, onSuccess }: { body: string; onSuccess: Function }) => {

  const [value, setValue] = useState(body)

  async function onSave(): Promise<void> {
    // Save template
    onSuccess()
  }

  return (
    <>
      <h2>Create message template</h2>
      <h4>Message</h4>
      <TextArea highlight={true} value={value} onChange={setValue} />
      <div className="align-right">
        <PrimaryButton disabled={!value} onClick={onSave}>Next →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSTemplate
