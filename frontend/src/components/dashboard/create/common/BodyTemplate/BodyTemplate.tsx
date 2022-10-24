import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SMSCampaign, SMSProgress, TelegramProgress } from 'classes'
import {
  ErrorBlock,
  NextButton,
  StepHeader,
  StepSection,
  TextArea,
} from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { CampaignContext } from 'contexts/campaign.context'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'
import { SegmentedMessage } from 'sms-segments-calculator'

import styles from './BodyTemplate.module.scss'

// correct as at 12 Jun 2022; to use if costPerSMS from backend unavailable
export const FALLBACK_COST_PER_SMS_SGD = 0.0395 * 1.4

const SmsMessageBodyInfo = ({
  body,
  costPerSMS,
}: {
  body: string
  costPerSMS: number
}) => {
  const segmentedMessage = new SegmentedMessage(body)
  const segmentEncoding = segmentedMessage.encodingName
  const segmentCount = segmentedMessage.segmentsCount

  return (
    <p className={styles.characterCount}>
      This SMS will cost approximately SGD{' '}
      {(segmentCount * costPerSMS).toFixed(4)}.
      <br />
      This estimate is calculated based on Twilio&apos;s pricing. Find out more{' '}
      <a
        href="https://go.gov.sg/postman-sms-cost"
        target="_blank"
        rel="noopener noreferrer"
      >
        here
      </a>
      .
      <br />
      {body.length} characters | {segmentCount} message segment(s) |{' '}
      {segmentEncoding} encoding
    </p>
  )
}

const TelegramMessageBodyInfo = ({ body }: { body: string }) => (
  <p className={styles.characterCount}>{body.length} characters</p>
)

function BodyTemplate({
  setActiveStep,
  warnCharacterCount,
  errorCharacterCount,
  saveTemplate,
  costPerMessage,
}: {
  setActiveStep:
    | Dispatch<SetStateAction<SMSProgress>>
    | Dispatch<SetStateAction<TelegramProgress>>
  warnCharacterCount: number
  errorCharacterCount: number
  saveTemplate: (
    campaignId: number,
    body: string
  ) => Promise<{
    numRecipients: number
    updatedTemplate?: { body: string; params: string[] }
  }>
  costPerMessage?: number
}) {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { setFinishLaterContent } = useContext(FinishLaterModalContext)
  const [body, setBody] = useState(replaceNewLines(campaign.body))
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>(null)
  const { id: campaignId } = useParams<{ id: string }>()

  useEffect(() => {
    let errorMsg = null
    if (body.length > errorCharacterCount) {
      errorMsg = (
        <span>
          Your template has more than <b>{errorCharacterCount}</b> characters
          and can&apos;t be sent. Consider making your message short and sweet
          to make it easier to read on a mobile device.
        </span>
      )
    } else if (body.length > warnCharacterCount) {
      errorMsg = (
        <span>
          Your template has more than {warnCharacterCount} characters. Messages
          which are longer than <b>{errorCharacterCount}</b> characters
          (including keywords) can&apos;t be sent. Consider making your message
          short and sweet to make it easier to read on a mobile device.
        </span>
      )
    }
    setErrorMsg(errorMsg)
  }, [body.length, errorCharacterCount, warnCharacterCount])

  const handleSaveTemplate = useCallback(async (): Promise<void> => {
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
        updateCampaign({
          body: updatedTemplate.body,
          params: updatedTemplate.params,
          numRecipients,
        })
        setActiveStep((s: SMSProgress | TelegramProgress) => s + 1)
      }
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
  }, [body, campaignId, setActiveStep, updateCampaign, saveTemplate])

  // Set callback for finish later button
  useEffect(() => {
    setFinishLaterContent(
      <SaveDraftModal
        saveable
        onSave={async () => {
          if (!campaignId) return
          try {
            if (!body) throw new Error('Message template cannot be empty!')
            await saveTemplate(+campaignId, body)
          } catch (e) {
            setErrorMsg((e as Error).message)
            throw e
          }
        }}
      />
    )
    return () => {
      setFinishLaterContent(null)
    }
  }, [body, campaignId, setFinishLaterContent, saveTemplate])

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }

  return (
    <>
      <StepSection>
        <StepHeader title="Create message template" subtitle="Step 1" />
        <div>
          <h4>
            <label htmlFor="message">Message</label>
          </h4>
          <p>
            To personalise your message, include keywords that are surrounded by
            double curly braces. The keywords in your message template should
            match the headers in your recipients CSV file.
            <br />
            <b>Note:</b> Recipient (mobile number) is a required column in the
            CSV file.
          </p>
          <p>
            Example
            <br />
            Reminder: Dear <b>{'{{ name }}'}</b>, your next appointment at{' '}
            <b>{'{{ clinic }}'}</b> is on <b>{'{{ date }}'} </b>
            at <b>{'{{ time }}'}</b>.
          </p>
        </div>
        <TextArea
          id="message"
          placeholder="Enter message"
          highlight={true}
          value={body}
          onChange={setBody}
        />
        {campaign instanceof SMSCampaign ? (
          <SmsMessageBodyInfo
            body={body}
            costPerSMS={costPerMessage ?? FALLBACK_COST_PER_SMS_SGD}
          />
        ) : (
          <TelegramMessageBodyInfo body={body} />
        )}
      </StepSection>

      <NextButton
        disabled={!body || body.length > errorCharacterCount}
        onClick={handleSaveTemplate}
      />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default BodyTemplate
