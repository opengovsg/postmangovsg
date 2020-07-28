import React, { useState, useEffect } from 'react'

import { TextArea, NextButton, ErrorBlock } from 'components/common'
import { useParams } from 'react-router-dom'
import { exceedsCharacterThreshold, saveTemplate } from 'services/sms.service'
import styles from '../Create.module.scss'

const SMSTemplate = ({
  body: initialBody,
  onNext,
}: {
  body: string
  onNext: (changes: any, next?: boolean) => void
}) => {
  const [body, setBody] = useState(replaceNewLines(initialBody))
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams()

  useEffect(() => {
    if (exceedsCharacterThreshold(body)) {
      setErrorMsg(
        (
          <span>
            Seems like you have more than 1000 characters in your template. If
            your message exceeds the total 1600 characters (including keywords),
            then they won&apos;t be sent. Consider making your message short and
            sweet to make it easier to read on a mobile device.
          </span>
        ) as any
      )
    } else {
      setErrorMsg(null)
    }
  }, [body])

  async function handleSaveTemplate(): Promise<void> {
    setErrorMsg(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      const { updatedTemplate, numRecipients } = await saveTemplate(
        +campaignId,
        body
      )
      onNext({
        body: updatedTemplate?.body,
        params: updatedTemplate?.params,
        numRecipients,
      })
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }

  return (
    <>
      <sub>Step 1</sub>
      <h2>Create message template</h2>
      <h4>Message</h4>
      <p>
        To personalise your message, include keywords that are surrounded by
        double curly braces. The keywords in your message template should match
        the headers in your recipients CSV file.
        <br />
        <b>Note:</b> Recipient (mobile number) is a required column in the CSV
        file.
      </p>
      <p>
        Example
        <br />
        Reminder: Dear <b>{'{{ name }}'}</b>, your next appointment at{' '}
        <b>{'{{ clinic }}'}</b> is on <b>{'{{ date }}'} </b>
        at <b>{'{{ time }}'}</b>.
      </p>
      <TextArea
        placeholder="Enter message"
        highlight={true}
        value={body}
        onChange={setBody}
      />
      <p className={styles.characterCount}>{body.length} characters</p>
      <NextButton disabled={!body} onClick={handleSaveTemplate} />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default SMSTemplate
