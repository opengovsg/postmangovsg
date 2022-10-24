import { useState } from 'react'
import { TextInputWithButton } from 'components/common'

const TelegramValidationInput = ({
  onClick,
  buttonDisabled,
}: {
  onClick: (recipient: string) => any
  buttonDisabled?: boolean
}) => {
  const [recipient, setRecipient] = useState('')

  function isInvalidRecipient() {
    return !/^\+?\d+$/g.test(recipient)
  }

  async function onClickHandler() {
    await onClick(recipient)
  }

  return (
    <TextInputWithButton
      id="validateTelegram"
      type="tel"
      value={recipient}
      onChange={setRecipient}
      onClick={onClickHandler}
      buttonDisabled={isInvalidRecipient() || buttonDisabled}
      placeholder="Enter test mobile number"
      buttonLabel={
        <>
          Send test message
          <i className="bx bxl-telegram"></i>
        </>
      }
      loadingButtonLabel="Sending..."
    />
  )
}

export default TelegramValidationInput
