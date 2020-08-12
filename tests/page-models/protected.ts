import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'

const passwordInput = ReactSelector('Protected TextInputWithButton TextInput')
const errorBlock = ReactSelector('Protected ErrorBlock')
const preview = ReactSelector('Protected ProtectedPreview')

/**
 * Enter password for protected message page
 * @param password
 * @throws Error If password is incorrect or verification fails
 */
const enterPassword = async (password: string): Promise<void> => {
  await t.selectText(passwordInput).pressKey('delete')
  await t.typeText(passwordInput, password).pressKey('enter')
  const hasError = await errorBlock.exists
  if (hasError) {
    const errorMsg = await errorBlock.textContent
    throw new Error(errorMsg)
  }
}

/**
 * Retrieves the protected message
 */
const getProtectedMessage = async (): Promise<string> => {
  return preview.textContent
}

export const ProtectedPage = {
  enterPassword,
  getProtectedMessage,
}
