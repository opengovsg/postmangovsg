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
import { CampaignContext } from 'contexts/campaign.context'

import { getAvailableTemplates, pickTemplate } from 'services/govsg.service'

function GovsgPickTemplate({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<GovsgProgress>>
}) {
  const { campaign: campaign, updateCampaign } = useContext(CampaignContext)
  const [templateId, setTemplateId] = useState(
    (campaign as GovsgCampaign).templateId
  )
  const [availableTemplates, setAvailableTemplates] = useState<
    GovsgTemplate[] | null
  >(null)
  const [errorMsg, setErrorMsg] = useState<ReactNode>(null)
  const { id: campaignId } = useParams<{ id: string }>()
  useEffect(() => {
    void (async function () {
      try {
        const templates = await getAvailableTemplates()
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

      if (templateId !== (campaign as GovsgCampaign).templateId) {
        const update = await pickTemplate({
          campaignId: +campaignId,
          templateId,
        })
        updateCampaign({
          body: update.template.body,
          params: update.template.params,
          templateId,
          numRecipients: update.num_recipients,
        })
      }
      setActiveStep((s: GovsgProgress) => s + 1)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
  }, [campaignId, setActiveStep, updateCampaign, campaign, templateId])

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
                  value={t.body}
                  shouldHighlightVariables
                  preview
                />
              </RadioChoice>
            ))
          )}
          <p className={styles.italicSubtext}>More templates coming soon...</p>
        </div>
      </StepSection>
      <NextButton
        disabled={!templateId || !campaignId}
        onClick={handlePickTemplate}
      />
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </>
  )
}

export default GovsgPickTemplate
