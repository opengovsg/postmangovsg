import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

const stayButton = ReactSelector('Unsubscribe PrimaryButton')
const unsubscribeButton = ReactSelector('Unsubscribe TextButton')
const messageHeader = ReactSelector('Unsubscribe').find('h2')
const errorBlock = ReactSelector('Unsubscribe ErrorBlock')

const stay = async (): Promise<void> => {
  await t
    .click(stayButton)
    .expect(messageHeader.textContent)
    .contains('Excellent')
}

const unsubscribe = async (): Promise<void> => {
  await t.click(unsubscribeButton)
  const hasError = await errorBlock.hasChildNodes
  if (hasError) {
    const errorMsg = await errorBlock.textContent
    throw new Error(errorMsg)
  }
}

export const UnsubscribePage = {
  stay,
  unsubscribe,
}
