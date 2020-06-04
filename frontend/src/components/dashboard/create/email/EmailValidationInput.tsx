import React, { useState } from 'react'
import isEmail from 'validator/lib/isEmail'

import { TextInputWithButton } from 'components/common'

const EmailValidationInput = ({
  onClick,
  buttonDisabled,
}: {
  onClick: (recipient: string) => any
  buttonDisabled?: boolean
}) => {
  const [recipient, setRecipient] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  function isInvalidRecipient() {
    return !isEmail(recipient)
  }

  async function onClickHandler() {
    setIsValidating(true)
    await onClick(recipient)
    setIsValidating(false)
    setRecipient('')
  }

  return (
    <TextInputWithButton
      type="email"
      value={recipient}
      onChange={setRecipient}
      onClick={onClickHandler}
      inputDisabled={isValidating}
      buttonDisabled={isInvalidRecipient() || isValidating || buttonDisabled}
    >
      {isValidating ? (
        'Sending...'
      ) : (
        <>
          Send test email
          <i className="bx bx-envelope-open"></i>
        </>
      )}
    </TextInputWithButton>
  )
}

export default EmailValidationInput
