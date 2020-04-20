import React, { useState } from 'react'

import { TextArea, PrimaryButton } from 'components/common'
import { useParams } from 'react-router-dom'
import { saveTemplate } from 'services/email.service'

const EmailTemplate = ({ subject: initialSubject, body: initialBody, onNext }:
  { subject: string; body: string; onNext: (changes: any, next?: boolean) => void }) => {

  const [body, setBody] = useState(initialBody)
  const [subject, setSubject] = useState(initialSubject)
  const params: {id?: string} = useParams()

  async function handleSaveTemplate(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await saveTemplate(+params.id!, subject, body)
      onNext({ subject, body })
    } catch(err){
      console.error(err)
    }
  }

  return (
    <>
      <sub>Step 1</sub>
      <h2>Create email message</h2>
      <p>Before writing your message, upload your recipients list.
        Including attributes in your CSV will allow you to customise your message to each recipient.</p>
      <h4>Subject</h4>
      <p>Enter subject of the email</p>
      <TextArea highlight={true} singleRow={true} placeholder="Enter subject" value={subject} onChange={setSubject} />
      <h4>Message</h4>
      <p>
        To personalise your message, include attributes in your uploaded file,
        and use double curly braces like this: Hello {'{{ name }}'}, your ID number is {'{{ id }}'}.
      </p>
      <TextArea highlight={true} placeholder="Enter email message" value={body} onChange={setBody} />
      <div className="separator"></div>
      <div className="progress-button">
        <PrimaryButton disabled={!body || !subject} onClick={handleSaveTemplate}>Upload Recipients →</PrimaryButton>
      </div>
    </>
  )
}

export default EmailTemplate
