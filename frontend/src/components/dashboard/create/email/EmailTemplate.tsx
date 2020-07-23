import React, { useState } from 'react'

import {
  TextArea,
  PrimaryButton,
  ErrorBlock,
  TextInput,
} from 'components/common'
import { useParams } from 'react-router-dom'
import { saveTemplate } from 'services/email.service'

import styles from './EmailTemplate.module.scss'

const EmailTemplate = ({
  subject: initialSubject,
  body: initialBody,
  replyTo: initialReplyTo,
  protect,
  onNext,
}: {
  subject: string
  body: string
  replyTo: string | null
  protect: boolean
  onNext: (changes: any, next?: boolean) => void
}) => {
  const [body, setBody] = useState(replaceNewLines(initialBody))
  const [errorMsg, setErrorMsg] = useState(null)
  const [subject, setSubject] = useState(initialSubject)
  const [replyTo, setReplyTo] = useState(initialReplyTo)
  const { id: campaignId } = useParams()

  const protectedBodyPlaceholder =
    'Dear {{ recipient }}, \n\n You may access your results via this link <a href="{{ protectedlink }}">{{ protectedlink }}</a> . \n\nPlease login with your birthday (DDMMYYYY) followed by the last 4 characters of your NRIC. E.g. 311290123A'
  const bodyPlaceholder =
    'Dear {{ name }}, your next appointment at {{ clinic }} is on {{ date }} at {{ time }}'

  async function handleSaveTemplate(): Promise<void> {
    setErrorMsg(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      const { updatedTemplate, numRecipients } = await saveTemplate(
        +campaignId,
        subject,
        body,
        replyTo
      )
      onNext({
        subject: updatedTemplate?.subject,
        body: updatedTemplate?.body,
        replyTo: updatedTemplate?.reply_to,
        params: updatedTemplate?.params,
        numRecipients,
      })
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n') || ''
  }

  return (
    <>
      <sub>Step 1</sub>
      <h2>Create email message</h2>

      <h4>Subject</h4>
      <p>Enter subject of the email</p>
      <TextArea
        highlight={true}
        singleRow={true}
        placeholder="Enter subject"
        value={subject}
        onChange={setSubject}
      />
      <h4>{protect ? 'Message A' : 'Message'}</h4>
      {protect ? (
        <p>
          You can use the following keywords to personalise your message.
          <li>
            <b>{'{{ protectedlink }}'}</b> - <i>Required</i>. Include this
            keyword in Message A template, but not in the CSV file. It will be
            automatically generated for password protected emails.
          </li>
          <li>
            <b>{'{{ recipient }}'}</b> - <i>Optional</i>. This keyword will be
            replaced by the email address of the recipient.
          </li>
        </p>
      ) : (
        <p>
          To personalise your message, include keywords that are surrounded by
          double curly braces. The keywords in your message template should
          match the headers in your recipients CSV file.
          <br />
          <b>Note:</b> Recipient (email address) is a required column in the CSV
          file.
        </p>
      )}
      <TextArea
        highlight={true}
        placeholder={protect ? protectedBodyPlaceholder : bodyPlaceholder}
        value={body}
        onChange={setBody}
      />
      <h4 className={styles.replyToHeader}>
        Replies <em>optional</em>
      </h4>
      <p className={styles.replyToInfo}>
        All replies will be directed to the email address indicated below
      </p>
      <TextInput
        placeholder="Enter reply-to email address"
        value={replyTo || ''}
        onChange={setReplyTo}
      />
      <div className="separator"></div>
      <div className="progress-button">
        <PrimaryButton
          disabled={!body || !subject}
          onClick={handleSaveTemplate}
        >
          Upload recipients →
        </PrimaryButton>
      </div>
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default EmailTemplate
