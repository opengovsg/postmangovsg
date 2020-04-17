import React, { useState } from 'react'

import { TextArea, PrimaryButton } from 'components/common'

const EmailTemplate = ({ subject: initialSubject, body: initialBody, onNext }:
  { subject: string; body: string; onNext: (changes: any, next?: boolean) => void }) => {

  const [body, setBody] = useState(initialBody)
  const [subject, setSubject] = useState(initialSubject)

  async function onNextClicked(): Promise<void> {
    // Save template
    onNext({ subject, body })
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
        <PrimaryButton disabled={!body || !subject} onClick={onNextClicked}>Upload Recipients →</PrimaryButton>
      </div>
    </>
  )
}

export default EmailTemplate
