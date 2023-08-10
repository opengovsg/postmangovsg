import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { useParams } from 'react-router-dom'

import { getLocalisedTemplateBody } from '../../../../utils/templateLocalisation'

import styles from './GovsgPickTemplate.module.scss'
import RadioChoice from './RadioChoice'

import { GovsgCampaign, GovsgProgress, GovsgTemplate } from 'classes'
import {
  ErrorBlock,
  NextButton,
  RichTextEditor,
  StepHeader,
  StepSection,
} from 'components/common'
import { LanguageChipGroup } from 'components/common/ChipGroup/LanguageChipGroup'
import { useGovsgV } from 'components/custom-hooks/useGovsgV'
import { CampaignContext } from 'contexts/campaign.context'

import { getAvailableTemplates, pickTemplate } from 'services/govsg.service'

function GovsgPickTemplate({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<GovsgProgress>>
}) {
  const { canAccessGovsgV } = useGovsgV()
  const { campaign: campaign, updateCampaign } = useContext(CampaignContext)
  const typedCampaign = campaign as GovsgCampaign
  const [templateId, setTemplateId] = useState(typedCampaign.templateId)
  const [availableTemplates, setAvailableTemplates] = useState<
    GovsgTemplate[] | null
  >(null)
  const [errorMsg, setErrorMsg] = useState<ReactNode>(null)
  const { id: campaignId } = useParams<{ id: string }>()
  const [selectedLanguage, setSelectedLanguage] = useState<WhatsAppLanguages>(
    WhatsAppLanguages.english
  )
  const [forSingleRecipient, setForSingleRecipient] = useState<boolean | null>(
    typedCampaign.forSingleRecipient === true ||
      typedCampaign.forSingleRecipient === false
      ? typedCampaign.forSingleRecipient
      : null
  )

  useEffect(() => {
    void (async function () {
      try {
        const templates = await getAvailableTemplates()
        if (templates.length === 0) {
          setErrorMsg(
            'No templates available. Please contact your administrator to create templates.'
          )
        }
        setAvailableTemplates(templates)
      } catch {
        setErrorMsg(
          <span>
            Something went wrong while loading the available templates. Please
            try again later.
          </span>
        )
      }
    })()
  }, [])

  const handlePickTemplate = useCallback(async (): Promise<void> => {
    setErrorMsg(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      if (!templateId) {
        return
      }
      if (forSingleRecipient === null) {
        return
      }

      if (
        templateId !== typedCampaign.templateId ||
        forSingleRecipient !== typedCampaign.forSingleRecipient
      ) {
        const update = await pickTemplate({
          campaignId: +campaignId,
          templateId,
          forSingleRecipient,
        })
        updateCampaign({
          body: update.template.body,
          params: update.template.params,
          templateId,
          numRecipients: update.num_recipients,
          paramMetadata: update.template.param_metadata,
          forSingleRecipient,
          languages: update.template.languages,
        })
      }
      setActiveStep((s: GovsgProgress) => s + 1)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
  }, [
    campaignId,
    setActiveStep,
    updateCampaign,
    templateId,
    forSingleRecipient,
    typedCampaign.forSingleRecipient,
    typedCampaign.templateId,
  ])

  return (
    <>
      <StepSection>
        <StepHeader title="Pick a message template" subtitle="Step 1" />
        <div>
          <h4>Select message template</h4>
          <p>
            To communicate via the Gov.sg Whatsapp channel, select one of these
            message templates
          </p>
          {availableTemplates === null ? (
            <div className={styles.loader}>
              <i className="bx bx-loader-alt bx-spin" />
            </div>
          ) : (
            availableTemplates.map((t: GovsgTemplate) => (
              <>
                <RadioChoice
                  key={t.id}
                  aria-label={`${t.id}`}
                  id={`${t.id}`}
                  value={`${t.id}`}
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                  label={t.name}
                >
                  <RichTextEditor
                    key={selectedLanguage}
                    value={getLocalisedTemplateBody(
                      t.languages,
                      selectedLanguage,
                      t.body
                    )}
                    shouldHighlightVariables
                    preview
                  />
                  {canAccessGovsgV && t.languages.length > 0 && (
                    <LanguageChipGroup
                      options={t.languages.map((languageSupport) =>
                        languageSupport.language.toLowerCase()
                      )}
                      selected={selectedLanguage}
                      setSelection={setSelectedLanguage}
                    />
                  )}
                </RadioChoice>
              </>
            ))
          )}
          <p className={styles.italicSubtext} style={{ marginBottom: '3rem' }}>
            More templates coming soon...
          </p>
          {templateId && (
            <>
              <h4 style={{ marginBottom: '1rem' }}>
                How many people to send to
              </h4>
              <RadioChoice
                aria-label="One recipient"
                id="recipient-single"
                value="single recipient"
                checked={forSingleRecipient === true}
                onChange={() => setForSingleRecipient(true)}
                label="One recipient"
              />
              <RadioChoice
                aria-label="Many recipients (bulk send by uploading CSV)"
                id="recipient-multiple"
                value="multiple recipients"
                checked={forSingleRecipient === false}
                onChange={() => setForSingleRecipient(false)}
                label="Many recipients (bulk send by uploading CSV)"
              />
            </>
          )}
        </div>
      </StepSection>
      <NextButton
        disabled={!templateId || !campaignId || forSingleRecipient === null}
        onClick={handlePickTemplate}
      />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default GovsgPickTemplate
