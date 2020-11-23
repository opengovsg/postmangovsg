import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'

import {
  TextArea,
  NextButton,
  ErrorBlock,
  TextInput,
  Dropdown,
  StepHeader,
  StepSection,
} from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'
import { CampaignContext } from 'contexts/campaign.context'
import { useParams } from 'react-router-dom'
import { getCustomFromAddresses } from 'services/settings.service'
import { saveTemplate } from 'services/email.service'
import { EmailCampaign, EmailProgress } from 'classes'

import styles from './EmailTemplate.module.scss'

const EmailTemplate = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const {
    body: initialBody,
    subject: initialSubject,
    replyTo: initialReplyTo,
    from: initialFrom,
    protect,
  } = campaign as EmailCampaign
  const { setFinishLaterContent } = useContext(FinishLaterModalContext)
  const [body, setBody] = useState(replaceNewLines(initialBody))
  const [errorMsg, setErrorMsg] = useState(null)
  const [subject, setSubject] = useState(initialSubject)
  const [replyTo, setReplyTo] = useState(initialReplyTo)
  const [from, setFrom] = useState(initialFrom)
  const [customFromAddresses, setCustomFromAddresses] = useState(
    [] as { label: string; value: string }[]
  )
  const { id: campaignId } = useParams()

  const protectedBodyPlaceholder =
    'Dear {{ recipient }}, \n\n You may access your results via this link <a href="{{ protectedlink }}">{{ protectedlink }}</a> . \n\nPlease login with your birthday (DDMMYYYY) followed by the last 4 characters of your NRIC. E.g. 311290123A'
  const bodyPlaceholder =
    'Dear {{ name }}, your next appointment at {{ clinic }} is on {{ date }} at {{ time }}'

  const handleSaveTemplate = useCallback(
    async (propagateError = false): Promise<void> => {
      setErrorMsg(null)
      try {
        if (!campaignId) {
          throw new Error('Invalid campaign id')
        }
        const { updatedTemplate, numRecipients } = await saveTemplate(
          +campaignId,
          subject,
          body,
          replyTo,
          from
        )
        if (updatedTemplate) {
          updateCampaign({
            from: updatedTemplate.from,
            subject: updatedTemplate.subject,
            body: updatedTemplate.body,
            replyTo: updatedTemplate.reply_to,
            params: updatedTemplate.params,
            numRecipients,
          })
          setActiveStep((s) => s + 1)
        }
      } catch (err) {
        setErrorMsg(err.message)
        if (propagateError) throw err
      }
    },
    [body, campaignId, from, replyTo, setActiveStep, subject, updateCampaign]
  )

  async function populateFromAddresses() {
    const fromAddresses = await getCustomFromAddresses()
    const options = fromAddresses.map((v) => ({ label: v, value: v }))
    setCustomFromAddresses(options)
  }

  // Get custom from addresses
  useEffect(() => {
    populateFromAddresses()
  }, [])

  // Set callback for finish later button
  useEffect(() => {
    setFinishLaterContent(
      <SaveDraftModal
        saveable
        onSave={async () => {
          if (subject && body && from) {
            await handleSaveTemplate(true)
          }
        }}
      />
    )
    return () => {
      setFinishLaterContent(null)
    }
  }, [body, subject, from, handleSaveTemplate, setFinishLaterContent])

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n') || ''
  }

  return (
    <>
      <StepSection>
        <StepHeader title="Create email message" subtitle="Step 1" />

        <div>
          <h4>From</h4>
          <p>Emails will be sent from this address</p>
          <Dropdown
            onSelect={setFrom}
            options={customFromAddresses}
            defaultLabel={from || customFromAddresses[0]?.label}
          ></Dropdown>
        </div>

        <div>
          <h4>Subject</h4>
          <p>Enter subject of the email</p>
          <TextArea
            highlight={true}
            singleRow={true}
            placeholder="Enter subject"
            value={subject}
            onChange={setSubject}
          />
        </div>

        <div>
          <h4>{protect ? 'Message A' : 'Message'}</h4>
          {protect ? (
            <>
              <p>
                Please use the following keywords to personalise your message.
              </p>
              <p>
                <b>{'{{ recipient }}'}</b> - <i>Optional</i>
                <br />
                This keyword will be replaced by recipient’s email address.
              </p>
              <p>
                <b>{'{{ protectedlink }}'}</b> - <i>Required</i>
                <br />
                Include this keyword in Message A template, but not in the CSV
                file. It will be automatically generated for password protected
                emails.
              </p>
            </>
          ) : (
            <>
              <p>
                To personalise your message, include keywords that are
                surrounded by double curly braces. The keywords in your message
                template should match the headers in your recipients CSV file.
              </p>
              <p>
                <b>Note:</b> Recipient (email address) is a required column in
                the CSV file.
              </p>
            </>
          )}

          <TextArea
            highlight={true}
            placeholder={protect ? protectedBodyPlaceholder : bodyPlaceholder}
            value={body}
            onChange={setBody}
          />
        </div>

        <div>
          <h4 className={styles.replyToHeader}>
            Replies <em>optional</em>
          </h4>
          <p>
            All replies will be directed to the email address indicated below
          </p>
          <TextInput
            placeholder="Enter reply-to email address"
            value={replyTo || ''}
            onChange={setReplyTo}
          />
        </div>
      </StepSection>

      <NextButton disabled={!body || !subject} onClick={handleSaveTemplate} />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default EmailTemplate
