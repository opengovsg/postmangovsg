import { useContext, useEffect, useState } from 'react'
import { OutboundLink } from 'react-ga'
import { i18n } from '@lingui/core'
import ChooseChannelsImage from 'assets/img/choose-channels.svg'
import ConfirmImage from 'assets/img/confirm-modal.svg'
import FailureImage from 'assets/img/failure.png'
import SuccessImage from 'assets/img/success.png'
import { channelIcons, ChannelType } from 'classes'
import cx from 'classnames'
import {
  CredLabelInput,
  ErrorBlock,
  PrimaryButton,
  TextButton,
} from 'components/common'
import EmailValidationInput from 'components/dashboard/create/email/EmailValidationInput'
import SMSValidationInput from 'components/dashboard/create/sms/SMSValidationInput'
import TwilioCredentialsInput from 'components/dashboard/create/sms/TwilioCredentialsInput'
import TelegramCredentialsInput from 'components/dashboard/create/telegram/TelegramCredentialsInput'
import TelegramValidationInput from 'components/dashboard/create/telegram/TelegramValidationInput'
import { LINKS } from 'config'
import { ModalContext } from 'contexts/modal.context'
import {
  getStoredCredentials as getSmsStoredCredentials,
  storeCredentials as storeSmsCredentials,
} from 'services/sms.service'
import {
  getStoredCredentials as getTelegramStoredCredentials,
  storeCredentials as storeTelegramCredentials,
  verifyUserCredentials as verifyUserTelegramCredentials,
} from 'services/telegram.service'

import styles from './AddCredentialModal.module.scss'

enum AddCredentialStep {
  SelectType,
  Input,
  Validate,
  Success,
  Failure,
}

const AddCredentialModal = ({
  credType,
  onSuccess,
}: {
  credType: ChannelType | null
  onSuccess: () => void
}) => {
  // Using channel type as proxy for credential type for now
  const [isLoading, setIsLoading] = useState(credType !== null)
  const [label, setLabel] = useState('')
  const [credLabels, setCredLabels] = useState([] as string[])
  const [selectedCredType, setSelectedCredType] = useState(credType)
  const [credStep, setCredStep] = useState(
    credType ? AddCredentialStep.Input : AddCredentialStep.SelectType
  )
  const [credentials, setCredentials] = useState(null as any)
  const [error, setError] = useState(
    null as null | {
      message: string
      editStep: AddCredentialStep
      editLabel: string
    }
  )
  const modalContext = useContext(ModalContext)

  async function loadCredLabels(channelType: ChannelType) {
    setIsLoading(true)

    let storedCredLabels: string[]
    switch (channelType) {
      case ChannelType.SMS:
        storedCredLabels = await getSmsStoredCredentials()
        break
      case ChannelType.Telegram:
        storedCredLabels = await getTelegramStoredCredentials()
        break
      default:
        storedCredLabels = []
        break
    }

    setCredLabels(storedCredLabels)
    setIsLoading(false)
  }

  useEffect(() => {
    if (credType) {
      void loadCredLabels(credType)
    }
  }, [credType])

  // Render credential input based on selected type of credential
  function renderCredentialInput() {
    let credInput = (
      <CredLabelInput
        value={label}
        onChange={setLabel}
        labels={credLabels}
      ></CredLabelInput>
    )

    let nextFunc = () => setCredStep(AddCredentialStep.Validate)

    switch (selectedCredType) {
      case ChannelType.SMS:
        credInput = (
          <>
            <h2>Add new Twilio credentials</h2>
            {credInput}
            <TwilioCredentialsInput
              onFilled={setCredentials}
            ></TwilioCredentialsInput>
          </>
        )
        break
      case ChannelType.Email:
        credInput = <div>Not available</div>
        break
      case ChannelType.Telegram:
        credInput = (
          <>
            <h2>Add new Telegram credentials</h2>
            {credInput}
            <TelegramCredentialsInput
              onFilled={setCredentials}
            ></TelegramCredentialsInput>
          </>
        )

        nextFunc = () => {
          return validateTelegramBotToken()
        }
        break
    }
    return (
      <>
        {credInput}
        <div className="separator"></div>
        <div className={styles.actionButtons}>
          <PrimaryButton
            onClick={nextFunc}
            disabled={!(credentials && label)}
            loadingPlaceholder={
              <>
                Validating<i className="bx bx-loader-alt bx-spin"></i>
              </>
            }
          >
            Next <i className="bx bx-right-arrow-alt"></i>
          </PrimaryButton>
          <TextButton
            onClick={() => modalContext.close()}
            className={styles.cancel}
          >
            Cancel
          </TextButton>
        </div>
      </>
    )
  }

  function selectCredentialType(channelType: ChannelType) {
    setSelectedCredType(channelType)
    setCredStep(AddCredentialStep.Input)
  }

  function renderSelect() {
    return (
      <div className={styles.centerAlign}>
        <img src={ChooseChannelsImage} alt="" />
        <h2>Select channel type to add credentials</h2>
        <div className={styles.channelTypes}>
          <PrimaryButton onClick={() => selectCredentialType(ChannelType.SMS)}>
            SMS
            <i
              className={cx('bx', styles.icon, channelIcons[ChannelType.SMS])}
            ></i>
          </PrimaryButton>
          <PrimaryButton
            onClick={() => selectCredentialType(ChannelType.Telegram)}
          >
            Telegram
            <i
              className={cx(
                'bx',
                styles.icon,
                channelIcons[ChannelType.Telegram]
              )}
            ></i>
          </PrimaryButton>
        </div>
      </div>
    )
  }

  async function validateTelegramBotToken() {
    try {
      await storeTelegramCredentials({ label, ...credentials })
      setCredStep(AddCredentialStep.Validate)
      onSuccess()
    } catch (e) {
      console.error(e)
      setError({
        message: (e as Error).message,
        editStep: AddCredentialStep.Input,
        editLabel: 'Edit Credentials',
      })
      setCredStep(AddCredentialStep.Failure)
    }
  }

  // Validate credential call
  async function validateCredential(recipient: string) {
    setError(null)
    const error = {
      message: '',
      editStep: AddCredentialStep.Input,
      editLabel: 'Edit Credentials',
    }

    try {
      switch (selectedCredType) {
        case ChannelType.SMS:
          await storeSmsCredentials({ label, ...credentials, recipient })
          break
        case ChannelType.Telegram:
          error.editStep = AddCredentialStep.Validate
          error.editLabel = 'Try again'
          await verifyUserTelegramCredentials({ label, recipient })
          break
        case ChannelType.Email:
          throw new Error('not implemented')
      }
      setCredStep(AddCredentialStep.Success)
      onSuccess()
    } catch (e) {
      console.error(e)
      error.message = (e as Error).message
      setError(error)
      setCredStep(AddCredentialStep.Failure)
    }
  }

  // Render validation input based on selected type of credentials
  function renderValidate() {
    let validateInput, messageTitle, message

    switch (selectedCredType) {
      case ChannelType.SMS:
        messageTitle = 'Almost there, validate credentials to finish'
        message = (
          <>
            To ensure your credentials are working perfectly, please enter an
            available mobile number to receive a validation message.
          </>
        )
        validateInput = (
          <SMSValidationInput onClick={validateCredential}></SMSValidationInput>
        )
        break
      case ChannelType.Email:
        validateInput = (
          <EmailValidationInput
            onClick={validateCredential}
          ></EmailValidationInput>
        )
        break
      case ChannelType.Telegram:
        messageTitle = 'Subscribe to your bot, then validate credentials'
        message = (
          <>
            Before you validate the credentials, the phone number you are
            testing with must be already subscribed to the bot.&nbsp;
            <OutboundLink
              eventLabel={i18n._(LINKS.guideTelegramUrl)}
              to={i18n._(LINKS.guideTelegramUrl)}
              target="_blank"
            >
              Learn more
            </OutboundLink>
          </>
        )
        validateInput = <TelegramValidationInput onClick={validateCredential} />
        break
    }

    return (
      <>
        <img src={ConfirmImage} alt="" />
        <h2>{messageTitle}</h2>
        <p>{message}</p>
        {validateInput}
      </>
    )
  }

  function renderAddCredStep() {
    switch (credStep) {
      // Credential type select step
      case AddCredentialStep.SelectType:
        return renderSelect()
      // Input credentials step
      case AddCredentialStep.Input:
        return renderCredentialInput()
      // Validate credentials step
      case AddCredentialStep.Validate:
        return renderValidate()
      // Credentials stored successuly
      case AddCredentialStep.Success:
        return (
          <div className={styles.centerAlign}>
            <img src={SuccessImage} alt="" />
            <h3>Your credentials are working well.</h3>
            <PrimaryButton
              className={styles.padTop}
              onClick={() => modalContext.close()}
            >
              Done
            </PrimaryButton>
          </div>
        )
      // Credentials failed to store
      case AddCredentialStep.Failure:
        return (
          <div className={styles.centerAlign}>
            <img src={FailureImage} alt="" />
            <h3>Sorry, something went wrong.</h3>
            <ErrorBlock>{error?.message}</ErrorBlock>
            <PrimaryButton
              onClick={() =>
                setCredStep(error?.editStep || AddCredentialStep.Input)
              }
            >
              {error?.editLabel}
              <i className="bx bx-edit"></i>
            </PrimaryButton>
          </div>
        )
    }
  }

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loading}>
          <i className={'bx bx-loader-alt bx-spin'}></i>
        </div>
      ) : (
        renderAddCredStep()
      )}
    </div>
  )
}

export default AddCredentialModal
