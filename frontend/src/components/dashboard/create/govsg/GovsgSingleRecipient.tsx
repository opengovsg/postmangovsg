import {
  GovsgTemplateLanguageMetadata,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

import { capitalize } from 'lodash'

import { Dispatch, SetStateAction, useContext, useState } from 'react'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import { ChannelType, GovsgCampaign, GovsgProgress, Status } from 'classes'
import {
  ButtonGroup,
  ConfirmModal,
  ErrorBlock,
  PreviewBlock,
  PrimaryButton,
  StepHeader,
  StepSection,
  TextButton,
  TextInput,
} from 'components/common'
import { SimpleRadioButton } from 'components/common/Radio/SimpleRadioButton'
import { useGovsgV } from 'components/custom-hooks/useGovsgV'
import { AuthContext } from 'contexts/auth.context'
import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'
import { sendSingleRecipientCampaign } from 'services/govsg.service'
import { hydrateTemplate } from 'services/validate-csv.service'

const GovsgSingleRecipient = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<GovsgProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { experimentalData } = useContext(AuthContext)
  const { canAccessGovsgV } = useGovsgV()
  const typedCampaign = campaign as GovsgCampaign
  const fieldsToRender: { id: string; name: string }[] = typedCampaign.params
    .filter((p) => !!typedCampaign.paramMetadata[p].displayName)
    .map((p) => ({
      id: p,
      name: typedCampaign.paramMetadata[p].displayName as string,
    }))
  const defaultUserData = typedCampaign.params
    .filter((p) => !!typedCampaign.paramMetadata[p].defaultFromMetaField)
    .reduce(
      (cul, p) => ({ [p]: experimentalData[ChannelType.Govsg][p], ...cul }),
      {}
    )
  const [data, setData] = useState<Record<string, string>>(
    fieldsToRender.reduce((cul, f) => ({ [f.id]: '', ...cul }), {
      recipient: '',
      languageCode: WhatsAppLanguages.english,
    })
  )
  const { id: campaignId } = useParams<{ id: string }>()
  const modalContext = useContext(ModalContext)
  const [errMessage, setErrMessage] = useState<string>('')

  const getUpdateData = (field: string) => (value: string) => {
    setData(Object.assign({}, data, { [field]: value }))
  }
  const getTemplateBody = () => {
    return (
      typedCampaign.multilingualSupport.find(
        (languageSupport: GovsgTemplateLanguageMetadata) =>
          languageSupport.languageCode === data.languageCode
      )?.body ?? typedCampaign.body
    )
  }
  const getHydratedTemplateBody = () => {
    return hydrateTemplate(
      getTemplateBody(),
      Object.assign(
        {},
        data,
        fieldsToRender.reduce(
          (cul, f) =>
            !data[f.id]
              ? { [f.id]: `<mark>{{ ${f.name} }}</mark>`, ...cul }
              : cul,
          {}
        ),
        defaultUserData
      )
    )
  }

  const onModalConfirm = async () => {
    if (!campaignId) return
    try {
      await sendSingleRecipientCampaign(+campaignId, data)
      updateCampaign({ status: Status.Sending, numRecipients: 1 })
    } catch (e) {
      console.error(e)
    }
  }
  const openModal = () => {
    if (
      !/^(8|9)\d{7}$/.test(data.recipient) &&
      !/^\+\d+$/.test(data.recipient)
    ) {
      setErrMessage(
        'Invalid recipient. Phone number must be a Singapore one or include country code with a leading + sign'
      )
      return
    }
    setErrMessage('')
    modalContext.setModalContent(
      <ConfirmModal
        title="Are you absolutely sure?"
        subtitle="Sending out a campaign is irreversible."
        buttonText="Confirm send now"
        buttonIcon="bx-send"
        onConfirm={onModalConfirm}
      />
    )
  }
  return (
    <>
      <StepSection>
        <StepHeader title="Add recipient" subtitle="Step 2" />
        <div>
          <p>
            <label htmlFor="recipient">Recipient Mobile Number</label>{' '}
          </p>
          <TextInput
            id="recipient"
            aria-label="Recipient Mobile Number"
            placeholder="Fill in Recipient Mobile Number"
            onChange={getUpdateData('recipient')}
            value={data.recipient}
          />
        </div>
        {canAccessGovsgV && (
          <div>
            <p>
              <label htmlFor="language">Language</label>{' '}
            </p>
            {Object.keys(WhatsAppLanguages).map((language) => {
              const label = capitalize(language)
              const languageCode =
                WhatsAppLanguages[language as keyof typeof WhatsAppLanguages]
              return (
                <SimpleRadioButton
                  aria-label={label}
                  id={`language-${language}`}
                  value={languageCode}
                  checked={data.languageCode === languageCode}
                  onChange={() =>
                    setData({
                      ...data,
                      languageCode,
                    })
                  }
                  label={label}
                  key={language}
                />
              )
            })}
          </div>
        )}
        {fieldsToRender.map((f) => (
          <div key={f.id}>
            <p>
              <label htmlFor={f.id}>{f.name}</label>
            </p>
            <TextInput
              id={f.id}
              aria-label={f.name}
              placeholder={`Fill in ${f.name}`}
              onChange={getUpdateData(f.id)}
              value={data[f.id]}
            />
          </div>
        ))}
      </StepSection>
      <StepSection>
        <p>Preview</p>
        <PreviewBlock hideHeaders body={getHydratedTemplateBody()} />
      </StepSection>
      {errMessage && <ErrorBlock>{errMessage}</ErrorBlock>}
      <ButtonGroup>
        <PrimaryButton
          disabled={Object.keys(data).some((k) => !data[k])}
          className={styles.turquoiseGreenBtn}
          onClick={openModal}
        >
          Send campaign now <i className="bx bx-send" />
        </PrimaryButton>
        <TextButton onClick={() => setActiveStep((s: number) => s - 1)}>
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default GovsgSingleRecipient
