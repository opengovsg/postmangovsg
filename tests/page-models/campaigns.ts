import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

const createButton = ReactSelector('Campaigns TitleBar PrimaryButton').withText(
  'Create new campaign'
)

/**
 * Select create new campaign
 */
const selectCreateCampaign = async (): Promise<void> => {
  await t.click(createButton)
}

export const CampaignsPage = {
  selectCreateCampaign,
}
