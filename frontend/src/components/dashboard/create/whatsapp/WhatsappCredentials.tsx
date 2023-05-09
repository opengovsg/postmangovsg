import React, { Dispatch, SetStateAction, useContext, useState } from 'react'

import { OutboundLink } from 'react-ga'

import { WhatsappProgress } from 'classes'
import {
  ButtonGroup,
  NextButton,
  StepHeader,
  StepSection,
  TextButton,
  WarningBlock,
} from 'components/common'
import styles from 'components/dashboard/create/Create.module.scss'
import { CampaignContext } from 'contexts/campaign.context'

const WhatsappCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<WhatsappProgress>>
}) => {
  const { campaign } = useContext(CampaignContext)
  const { hasCredential: initialHasCredential } = campaign
  const [hasCredential] = useState(initialHasCredential)

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
        </StepHeader>
      </StepSection>
      <ButtonGroup>
        <NextButton
          disabled={!hasCredential}
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
