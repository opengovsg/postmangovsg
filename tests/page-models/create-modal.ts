import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

const nameInput = ReactSelector('CreateModal TextInput')
const channelTypeOptions = ReactSelector('CreateModal PrimaryButton')
const confirmButton = ReactSelector('CreateModal PrimaryButton').withText(
  'Create campaign'
)
const protectedCheckbox = ReactSelector('CreateModal Checkbox')

/**
 * Create a new campaign through the CreateModal
 * @param campaignName
 * @param channelType Can be 'SMS', 'Email' or 'Telegram'
 * @param protect Whether to create a protected campaign
 */
const createCampaign = async (
  campaignName: string,
  channelType: 'SMS' | 'Email' | 'Telegram',
  protect = false
): Promise<void> => {
  await t.typeText(nameInput, campaignName)
  await t.click(channelTypeOptions.withText(channelType))
  if (protect) {
    await t.click(protectedCheckbox)
  }
  await t.click(confirmButton)
}

export const CreateModalPage = {
  createCampaign,
}
