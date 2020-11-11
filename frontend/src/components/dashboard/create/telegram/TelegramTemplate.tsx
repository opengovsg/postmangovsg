import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { useParams } from 'react-router-dom'

import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'
import { CampaignContext } from 'contexts/campaign.context'
import {
  TextArea,
  NextButton,
  ErrorBlock,
  StepHeader,
  StepSection,
} from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { saveTemplate } from 'services/telegram.service'
import { TelegramCampaign, TelegramProgress } from 'classes'

const TelegramTemplate = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<TelegramProgress>>
}) => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { body: initialBody } = campaign as TelegramCampaign
  const { setFinishLaterContent } = useContext(FinishLaterModalContext)
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
        if (!updatedTemplate) return
        setCampaign(
          (campaign) =>
            ({
              ...campaign,
              body: updatedTemplate?.body,
              params: updatedTemplate?.params,
              numRecipients,
            } as TelegramCampaign)
        )
        setActiveStep((s) => s + 1)
      } catch (err) {
        setErrorMsg(err.message)
        if (propagateError) throw err
      }
    },
    [body, campaignId, setActiveStep, setCampaign]
  )

  // Set callback for finish later button
  useEffect(() => {
    setFinishLaterContent(
      <SaveDraftModal
        saveable
        onSave={async () => {
          if (body) await handleSaveTemplate(true)
        }}
      />
    )
    return () => {
      setFinishLaterContent(null)
    }
  }, [body, handleSaveTemplate, setFinishLaterContent])

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }

  return (
    <>
      <StepSection>
        <StepHeader title="Create message template" subtitle="Step 1" />
        <div>
          <h4>Message</h4>
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
          placeholder="Enter message"
          highlight={true}
          value={body}
          onChange={setBody}
        />
      </StepSection>

      <NextButton disabled={!body} onClick={handleSaveTemplate} />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default TelegramTemplate
