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
      <p>
        To personalise your message, include keywords that are surrounded by double curly braces.
        The keywords in your message template should match the headers in your recipients CSV file.
        <br/>
        <b>Note:</b> Recipient is a required column in the CSV file.
      </p>
      <p>
        Example<br/>
        Reminder: Dear {'{{ name }}'}, your next appointment at {'{{ clinic }}'} is on {'{{ date }}'}
        at {'{{ time }}'}.
      </p>
      <TextArea placeholder="Enter message" highlight={true} value={body} onChange={setBody} />
      <div className="progress-button">
        <PrimaryButton disabled={!body} onClick={handleSaveTemplate}>Upload Recipients →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSTemplate
