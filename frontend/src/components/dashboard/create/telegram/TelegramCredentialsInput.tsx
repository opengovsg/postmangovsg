import React, { useEffect, useState } from 'react'
import { TRANSTEXT } from 'config'

import { TextInput, LabelWithExternalLink } from 'components/common'
import { i18n } from 'locales'

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
        link={i18n._(TRANSTEXT.guideTelegramUrl)}
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
