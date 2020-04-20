import React, { useState } from 'react'

import { TextArea, PrimaryButton } from 'components/common'
import { useParams } from 'react-router-dom'
import { saveTemplate } from 'services/sms.service'

const SMSTemplate = ({ body: initialBody, onNext }: { body: string; onNext: (changes: any, next?: boolean) => void }) => {

  const [body, setBody] = useState(initialBody)
  const params: {id?: string} = useParams()

  async function handleSaveTemplate(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await saveTemplate(+params.id!, body)
      onNext({ body })
    } catch(err){
      console.error(err)
    }
  }

  return (
    <>
      <sub>Step 1</sub>
      <h2>Create message template</h2>
      <h4>Message</h4>
      <TextArea highlight={true} value={body} onChange={setBody} />
      <div className="progress-button">
        <PrimaryButton disabled={!body} onClick={handleSaveTemplate}>Upload Recipients →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSTemplate
