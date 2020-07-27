import React, { useEffect, useState } from 'react'
import { GUIDE_TELEGRAM_CREDENTIALS_URL } from 'config'

import { TextInput, LabelWithExternalLink } from 'components/common'

const TelegramCredentialsInput = ({
  onFilled,
}: {
  onFilled: (input: { telegramBotToken: string } | null) => any
}) => {
  const [telegramBotToken, setTelegramBotToken] = useState('')

  useEffect(() => {
    if (telegramBotToken) {
      onFilled({ telegramBotToken })
    } else {
      onFilled(null)
    }
  }, [telegramBotToken, onFilled])

  return (
    <>
      <LabelWithExternalLink
        label="Telegram Bot Token"
        link={GUIDE_TELEGRAM_CREDENTIALS_URL}
      />
      <TextInput
        placeholder="Enter Telegram Bot Token"
        value={telegramBotToken}
        onChange={setTelegramBotToken}
      />
    </>
  )
}

export default TelegramCredentialsInput
