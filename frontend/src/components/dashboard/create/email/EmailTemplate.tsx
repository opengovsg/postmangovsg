import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import { parseFromAddress } from '@shared/utils/from-address'
import {
  useState,
  useEffect,
  useCallback,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'

import { OutboundLink } from 'react-ga'

import { useParams } from 'react-router-dom'

import styles from './EmailTemplate.module.scss'

import { EmailCampaign, EmailProgress } from 'classes'
import {
  TextArea,
  NextButton,
  ErrorBlock,
  TextInput,
  Dropdown,
  StepHeader,
  StepSection,
  RichTextEditor,
  InfoBlock,
  ToggleSwitch,
  Checkbox,
} from 'components/common'

import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { LINKS } from 'config'
import { AuthContext } from 'contexts/auth.context'
import { CampaignContext } from 'contexts/campaign.context'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'

import { updateCampaign as apiUpdateCampaign } from 'services/campaign.service'
import { saveTemplate } from 'services/email.service'
import { getCustomFromAddresses } from 'services/settings.service'

const EmailTemplate = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { email: userEmail } = useContext(AuthContext)
  const {
    body: initialBody,
    subject: initialSubject,
    replyTo: initialReplyTo,
    from: initialFrom,
    showLogo: initialShowLogo,
    agencyName,
    agencyLogoURI,
    protect,
    shouldBccToMe: originalShouldBccToMe,
  } = campaign as EmailCampaign
  const { setFinishLaterContent } = useContext(FinishLaterModalContext)
  const [body, setBody] = useState(replaceNewLines(initialBody))
  const [errorMsg, setErrorMsg] = useState('')
  const [subject, setSubject] = useState(initialSubject)
  const [replyTo, setReplyTo] = useState(
    initialReplyTo === userEmail ? null : initialReplyTo
  )
  const [showLogo, setShowLogo] = useState(initialShowLogo ?? true)
  const [shouldBccToMe, setShouldBccToMe] = useState(
    originalShouldBccToMe ?? false
  )

  // initialFrom is undefined for a new campaign without a saved template
  const { fromName: initialFromName, fromAddress: initialFromAddress } =
    initialFrom
      ? parseFromAddress(initialFrom)
      : { fromName: '', fromAddress: '' }
  const [fromName, setFromName] = useState(initialFromName)
  const [fromAddress, setFromAddress] = useState(initialFromAddress)

  const [customFromAddresses, setCustomFromAddresses] = useState(
    [] as { label: string; value: string }[]
  )
  const { id: campaignId } = useParams<{ id: string }>()

  const protectedBodyPlaceholder =
    'Dear {{ recipient }}, \n\n You may access your results via this link <a href="{{ protectedlink }}">{{ protectedlink }}</a> . \n\nPlease login with your birthday (DDMMYYYY) followed by the last 4 characters of your NRIC. E.g. 311290123A'
  const bodyPlaceholder =
    'Dear {{ name }},\n\nYour next appointment at {{ clinic }} is on {{ date }} at {{ time }}\n\nMinistry of Health\n16 College Road, College of Medicine Building, Singapore 169854\n6325 9220 | www.moh.gov.sg'

  const handleSaveTemplate = useCallback(async (): Promise<void> => {
    setErrorMsg('')
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      const { updatedTemplate, numRecipients } = await saveTemplate(
        +campaignId,
        subject,
        body,
        replyTo,
        `${fromName} <${fromAddress}>`,
        showLogo
      )
      if (updatedTemplate) {
        updateCampaign({
          from: updatedTemplate.from,
          subject: updatedTemplate.subject,
          body: updatedTemplate.body,
          replyTo: updatedTemplate.reply_to,
          showLogo: updatedTemplate.show_logo,
          params: updatedTemplate.params,
          numRecipients,
        })
        setActiveStep((s) => s + 1)
      }
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }, [
    body,
    campaignId,
    replyTo,
    setActiveStep,
    subject,
    updateCampaign,
    fromAddress,
    fromName,
    showLogo,
  ])

  // Get custom from addresses
  useEffect(() => {
    async function populateFromAddresses() {
      const fromAddresses = await getCustomFromAddresses()
      const options = fromAddresses.map((from) => {
        const { fromAddress } = parseFromAddress(from)
        return { label: fromAddress, value: from }
      })
      setCustomFromAddresses(options)

      const { fromName, fromAddress } = parseFromAddress(fromAddresses[0])
      setFromName((prev) => prev || fromName)
      setFromAddress((prev) => prev || fromAddress)
    }

    void populateFromAddresses()
  }, [])

  // Set callback for finish later button
  useEffect(() => {
    setFinishLaterContent(
      <SaveDraftModal
        saveable
        onSave={async () => {
          if (!campaignId) return
          try {
            if (!subject || !body)
              throw new Error('Message subject or template cannot be empty!')
            await saveTemplate(
              +campaignId,
              subject,
              body,
              replyTo,
              `${fromName} <${fromAddress}>`,
              showLogo
            )
          } catch (err) {
            setErrorMsg((err as Error).message)
            throw err
          }
        }}
      />
    )
    return () => {
      setFinishLaterContent(null)
    }
  }, [
    body,
    subject,
    fromName,
    fromAddress,
    setFinishLaterContent,
    campaignId,
    replyTo,
    showLogo,
  ])

  function replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n') || ''
  }

  const handleSelectFromAddress = useCallback(
    (selectedFrom: string) => {
      const { fromName: selectedFromName, fromAddress: selectedFromAddress } =
        parseFromAddress(selectedFrom)

      // Use custom from name if it has already been set. For e.g.,
      // for "Custom <info@mail.postman.gov.sg>"", we should
      // use "Custom" instead of the default "Postman.gov.sg".
      setFromName(
        selectedFromAddress === initialFromAddress
          ? initialFromName
          : selectedFromName
      )
      setFromAddress(selectedFromAddress)
    },
    [initialFromName, initialFromAddress]
  )

  const getFromNameInputProps = () => {
    const mailVia = t`mailVia`

    // Strip mail via that is appended at then end of from name by the backend.
    const inputFromName = fromName?.replace(new RegExp(`\\s${mailVia}$`), '')
    const props: { value?: string; badge?: string } = {
      value: inputFromName,
    }

    const [selectedFrom] = customFromAddresses.filter(
      ({ label }) => label === fromAddress
    )
    if (selectedFrom) {
      const { fromName: selectedFromName } = parseFromAddress(
        selectedFrom?.value
      )
      props.badge = selectedFromName !== inputFromName?.trim() ? mailVia : ''
    }

    return props
  }

  const handleBccToMeChange = async () => {
    const newBccValue = !shouldBccToMe
    // set here first so user with slow internet won't see a lag and keep clicking
    setShouldBccToMe(newBccValue)
    try {
      await apiUpdateCampaign(campaignId as string, {
        shouldBccToMe: newBccValue,
      })
    } catch (e) {
      // revert back to original value if update fails
      setShouldBccToMe(!newBccValue)
    }
  }

  return (
    <>
      <StepSection>
        <StepHeader title="Create email message" subtitle="Step 1" />

        <div>
          <h4>From</h4>
          <p>Sender details</p>
          <TextInput
            {...getFromNameInputProps()}
            onChange={setFromName}
            aria-label="Sender name"
            placeholder={t`e.g. Ministry of Health`}
          />
          <Dropdown
            onSelect={handleSelectFromAddress}
            options={customFromAddresses}
            defaultLabel={fromAddress}
            aria-label="Custom from"
            disabled={customFromAddresses.length <= 1}
          ></Dropdown>
          <Checkbox checked={shouldBccToMe} onChange={handleBccToMeChange}>
            BCC to me
          </Checkbox>
        </div>

        <div>
          <h4>
            <label htmlFor="subject">Email Subject</label>
          </h4>
          <p>
            <label htmlFor="subject">
              Keep it short, specific and personalised. Try to use less than 10
              words.
            </label>
          </p>
          <TextArea
            id="subject"
            highlight
            singleRow
            placeholder={t`e.g. Appointment Confirmation`}
            value={subject}
            onChange={setSubject}
          />
        </div>

        <div>
          <div className={styles.logoTextContainer}>
            <div className={styles.logoText}>
              <h4>
                <label htmlFor="logo">Show or hide logo</label>
              </h4>
              <p>
                <label htmlFor="logo">
                  Your agency’s logo will appear in the header of the email.
                </label>
              </p>
              <p>
                <b>Note:</b> Logos may not be visible in government email
                inboxes.
              </p>
            </div>
            {!!agencyLogoURI && (
              <div className={styles.logoSwitch}>
                <ToggleSwitch
                  checked={showLogo}
                  onChange={setShowLogo}
                ></ToggleSwitch>
              </div>
            )}
          </div>
          {agencyLogoURI ? (
            showLogo && (
              <div className={styles.agencyLogoContainer}>
                <img
                  className={styles.agencyLogo}
                  src={agencyLogoURI}
                  alt={agencyName}
                />
              </div>
            )
          ) : (
            <InfoBlock className={styles.uploadLogoInfoBlock}>
              Your agency’s logo has not been uploaded. To upload a logo, please
              fill up this{' '}
              <OutboundLink
                className={styles.uploadLogoLink}
                eventLabel={i18n._(LINKS.uploadLogoUrl)}
                to={i18n._(LINKS.uploadLogoUrl)}
                target="_blank"
              >
                form
              </OutboundLink>
              .
            </InfoBlock>
          )}
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
                You can increase the legitimacy of your email by signing off
                with a proper agency signature.
              </p>
              <p>
                <b>Suggested signature:</b>
                <br />
                Agency name
                <br />
                Office address
                <br />
                Contact number | Website
              </p>
            </>
          )}

          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder={protect ? protectedBodyPlaceholder : bodyPlaceholder}
          />
        </div>

        <div>
          <h4 className={styles.replyToHeader}>
            <label htmlFor="replyTo">Replies</label>
          </h4>
          <p>
            <label htmlFor="replyTo">
              If left blank, replies will be directed to {userEmail}
            </label>
          </p>
          <TextInput
            id="replyTo"
            placeholder="Enter reply-to email address"
            value={replyTo || ''}
            onChange={setReplyTo}
          />
        </div>
      </StepSection>

      <NextButton
        disabled={!fromName || !fromAddress || !body || !subject}
        onClick={handleSaveTemplate}
      />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default EmailTemplate
