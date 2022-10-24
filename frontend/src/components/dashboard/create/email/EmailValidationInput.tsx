import { useState } from 'react'
import { TextInputWithButton } from 'components/common'
import isEmail from 'validator/lib/isEmail'

const EmailValidationInput = ({
  onClick,
}: {
  onClick: (recipient: string) => any
}) => {
  const [recipient, setRecipient] = useState('')

  function isInvalidRecipient() {
    return !isEmail(recipient)
  }

  async function onClickHandler() {
    await onClick(recipient)
  }

  return (
    <TextInputWithButton
      id="validateEmail"
      type="email"
      value={recipient}
      onChange={setRecipient}
      onClick={onClickHandler}
      buttonDisabled={isInvalidRecipient()}
      buttonLabel={
        <>
          Send test email
          <i className="bx bx-envelope-open"></i>
        </>
      }
      loadingButtonLabel="Sending..."
    />
  )
}

export default EmailValidationInput
