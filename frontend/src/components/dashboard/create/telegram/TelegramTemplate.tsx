import React, { useState, useCallback, useEffect, useContext } from 'react'

import { TextArea, NextButton, ErrorBlock } from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { ModalContext } from 'contexts/modal.context'
import { useParams } from 'react-router-dom'
import { saveTemplate } from 'services/telegram.service'

const TelegramTemplate = ({
  body: initialBody,
  onNext,
  finishLaterCallbackRef,
}: {
  body: string
  onNext: (changes: any, next?: boolean) => void
  finishLaterCallbackRef: React.MutableRefObject<(() => void) | undefined>
}) => {
  const modalContext = useContext(ModalContext)
  const [body, setBody] = useState(replaceNewLines(initialBody))
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams()

  const handleSaveTemplate = useCallback(
    async (propagateError = false): Promise<void> => {
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
        if (propagateError) throw err
      }
    },
    [body, campaignId, onNext]
  )

  // Set callback for finish later button
  useEffect(() => {
    finishLaterCallbackRef.current = () => {
      modalContext.setModalContent(
        <SaveDraftModal
          saveable
          onSave={async () => {
            if (body) await handleSaveTemplate(true)
          }}
        />
      )
    }
    return () => {
      finishLaterCallbackRef.current = undefined
    }
  }, [body, finishLaterCallbackRef, handleSaveTemplate, modalContext])

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
      <NextButton disabled={!body} onClick={handleSaveTemplate} />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default TelegramTemplate
