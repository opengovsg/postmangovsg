import { useState } from 'react'
import { TextInputWithButton } from 'components/common'

const SMSValidationInput = ({
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
      id="validateSms"
      type="tel"
      value={recipient}
      onChange={setRecipient}
      onClick={onClickHandler}
      buttonDisabled={isInvalidRecipient() || buttonDisabled}
      placeholder="Enter test mobile number"
      buttonLabel={
        <>
          Send test SMS
          <i className="bx bx-envelope-open"></i>
        </>
      }
      loadingButtonLabel="Sending..."
    />
  )
}

export default SMSValidationInput
