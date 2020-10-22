import React, { useState, useCallback, useEffect, useContext } from 'react'

import { TextArea, NextButton, ErrorBlock } from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { ModalContext } from 'contexts/modal.context'
import { CampaignContext } from 'contexts/campaign.context'
import { useParams } from 'react-router-dom'
import { exceedsCharacterThreshold, saveTemplate } from 'services/sms.service'
import styles from '../Create.module.scss'
import { SMSCampaign } from 'classes'

const SMSTemplate = () => {
  console.log('SMSTemplate')
  const { campaign, setCampaign, setFinishLaterCallback } = useContext(
    CampaignContext
  )
  const modalContext = useContext(ModalContext)
  const [body, setBody] = useState(replaceNewLines(campaign.body))
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams()

  useEffect(() => {
    if (exceedsCharacterThreshold(body)) {
      setErrorMsg(
        (
          <span>
            Your template has more than 1000 characters. Messages which are
            longer than <b>1600</b> characters (including keywords) can&apos;t
            be sent. Consider making your message short and sweet to make it
            easier to read on a mobile device.
          </span>
        ) as any
      )
    } else {
      setErrorMsg(null)
    }
  }, [body])

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
        if (updatedTemplate) {
          setCampaign(
            (campaign) =>
              ({
                ...campaign,
                body: updatedTemplate.body,
                params: updatedTemplate.params,
                numRecipients,
                progress: campaign.progress + 1,
              } as SMSCampaign)
          )
        }
      } catch (err) {
        setErrorMsg(err.message)
        if (propagateError) throw err
      }
    },
    [body, campaignId, setCampaign]
  )

  // Set callback for finish later button
  useEffect(() => {
    console.log('updated')
    setFinishLaterCallback(() => () => {
      modalContext.setModalContent(
        <SaveDraftModal
          saveable
          onSave={async () => {
            if (body) await handleSaveTemplate(true)
          }}
        />
      )
    })
    return () => {
      setFinishLaterCallback(null)
    }
  }, [body, handleSaveTemplate, modalContext, setFinishLaterCallback])

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
