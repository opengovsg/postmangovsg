import React, { useState } from 'react'

import { TextArea, PrimaryButton } from 'components/common'

const SMSTemplate = ({ body: initialBody, onNext }: { body: string; onNext: (changes: any, next?: boolean) => void }) => {

  const [body, setBody] = useState(initialBody)

  async function onNextClicked(): Promise<void> {
    // Save template
    onNext({ body })
  }

  return (
    <>
      <sub>Step 1</sub>
      <h2>Create message template</h2>
      <h4>Message</h4>
      <TextArea highlight={true} value={body} onChange={setBody} />
      <div className="progress-button">
        <PrimaryButton disabled={!body} onClick={onNextClicked}>Upload Recipients →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSTemplate
