import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { OutboundLink } from 'react-ga'

import { WhatsappProgress } from 'classes'
import {
  ButtonGroup,
  Dropdown,
  ErrorBlock,
  NextButton,
  StepHeader,
  StepSection,
  TextButton,
  WarningBlock,
} from 'components/common'
import styles from 'components/dashboard/create/Create.module.scss'
import { CampaignContext } from 'contexts/campaign.context'
import {
  getPhoneNumbers,
  getStoredCredentials,
  getStoredTemplates,
} from 'services/whatsapp.service'

const WhatsappCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<WhatsappProgress>>
}) => {
  const { updateCampaign } = useContext(CampaignContext)
  const [errorMessage, setErrorMessage] = useState('')

  const [storedCredentials, setStoredCredentials] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedCredential, setSelectedCredential] = useState('')

  const [storedTemplates, setStoredTemplates] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const [storedNumbers, setStoredNumbers] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedNumber, setSelectedNumber] = useState('')

  const handleSelectCredentials = useCallback((credentials: string) => {
    setSelectedCredential(credentials)
    updateCampaign({ hasCredential: true })
  }, [])

  useEffect(() => {
    async function populateStoredCredentials() {
      try {
        const labels = await getStoredCredentials()
        setStoredCredentials(() => {
          if (labels.length > 0) {
            setSelectedCredential(labels[0])
          }
          return labels.map((c) => ({ label: c, value: c }))
        })
      } catch (e) {
        console.error(e)
        setErrorMessage((e as Error).message)
      }
    }
    void populateStoredCredentials()
  }, [])

  useEffect(() => {
    if (!selectedCredential) {
      return
    }

    // only when user has a valid credential can we load the waba's number and templates
    async function getCredentialPreloads() {
      try {
        const templates = await getStoredTemplates(selectedCredential)
        setStoredTemplates(
          templates.map((c) => ({ label: c.name, value: c.id }))
        )
      } catch (e) {
        console.error(e)
        setErrorMessage((e as Error).message)
      }

      try {
        const phoneNumbers = await getPhoneNumbers(selectedCredential)
        setStoredNumbers(
          phoneNumbers.map((c) => ({
            label: c.display_phone_number + ' / ' + c.verified_name,
            value: c.id,
          }))
        )
      } catch (e) {
        console.error(e)
        setErrorMessage((e as Error).message)
      }
    }
    void getCredentialPreloads()
  }, [selectedCredential])

  return (
    <>
      <StepSection>
        <StepHeader title="Set up WhatsApp Credentials" subtitle="Step 1">
          <WarningBlock>
            <span>
              Before you proceed, make sure you are onboarded to WhatsApp and
              have determined which billing account your messages should be
              charged to. If you have questions, you may reach us here. &nbsp;
              <OutboundLink
                className={styles.inputLabelHelpLink}
                eventLabel="https://go.gov.sg/postman-whatsapp"
                to="https://go.gov.sg/postman-whatsapp"
                target="_blank"
              >
                Learn more
              </OutboundLink>
            </span>
          </WarningBlock>
        </StepHeader>
        {storedCredentials.length == 0 && (
          <ErrorBlock>
            You do not have valid whatsapp credentials! Unable to proceed
          </ErrorBlock>
        )}
        <StepHeader title="WhatsApp Business Account (WABA)">
          <p>
            WhatsApp Business Account (WABA) determines how your messages are
            billed. Please select the right account to ensure you are billed
            correctly. If you have not been onboarding to WABA, please contact
            us &nbsp;
            <OutboundLink
              className={styles.inputLabelHelpLink}
              eventLabel="https://go.gov.sg/postman-whatsapp"
              to="https://go.gov.sg/postman-whatsapp"
              target="_blank"
            >
              here.
            </OutboundLink>
          </p>
          <p>Account</p>
          <Dropdown
            onSelect={handleSelectCredentials}
            options={storedCredentials}
            defaultLabel={selectedCredential}
            aria-label="Whatsapp credentials"
          ></Dropdown>
        </StepHeader>
        <StepHeader title={'Message template'}>
          <p>
            WhatsApp only allows sending of pre-approved template. If your
            template has not been approved before, please reach out to us &nbsp;
            <OutboundLink
              className={styles.inputLabelHelpLink}
              eventLabel="https://go.gov.sg/postman-whatsapp"
              to="https://go.gov.sg/postman-whatsapp"
              target="_blank"
            >
              here
            </OutboundLink>
            &nbsp; to submit a new template and get it approved.
          </p>
          <Dropdown
            onSelect={setSelectedTemplate}
            options={storedTemplates}
            aria-label="Message template"
          ></Dropdown>
        </StepHeader>
        <StepHeader title={'Phone number / Sender name'}>
          <p>
            Phone number determines the sender name of your messages. If your
            sender is not listed below, please contact us &nbsp;
            <OutboundLink
              className={styles.inputLabelHelpLink}
              eventLabel="https://go.gov.sg/postman-whatsapp"
              to="https://go.gov.sg/postman-whatsapp"
              target="_blank"
            >
              here
            </OutboundLink>
          </p>
          <Dropdown
            onSelect={setSelectedNumber}
            options={storedNumbers}
            aria-label="Sender name"
          ></Dropdown>
        </StepHeader>
      </StepSection>
      <ErrorBlock>{errorMessage}</ErrorBlock>

      <ButtonGroup>
        <NextButton
          disabled={!(selectedCredential && selectedTemplate && selectedNumber)}
          onClick={() => setActiveStep((s) => s + 1)}
        />
        <TextButton onClick={() => setActiveStep((s) => s - 1)}>
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default WhatsappCredentials
