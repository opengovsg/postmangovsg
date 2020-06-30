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
      <p>
        To personalise your message, include keywords that are surrounded by
        double curly braces. The keywords in your message template should match
        the headers in your recipients CSV file.
        <br />
        <b>Note:</b> Recipient is a required column in the CSV file.
      </p>
      <p>
        Example
        <br />
        Reminder: Dear <b>{'{{ name }}'}</b>, your next appointment at{' '}
        <b>{'{{ clinic }}'}</b> is on <b>{'{{ date }}'} </b>
        at <b>{'{{ time }}'}</b>.
      </p>
      <TextArea
        highlight={true}
        placeholder="Enter email message"
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
