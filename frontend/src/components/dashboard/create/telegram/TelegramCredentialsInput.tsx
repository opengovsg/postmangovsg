import { useEffect, useState } from 'react'
import { i18n } from '@lingui/core'
import { LabelWithExternalLink, TextInput } from 'components/common'
import { LINKS } from 'config'

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
        htmlFor="telegramBotToken"
        label="Telegram Bot Token"
        link={i18n._(LINKS.guideTelegramUrl)}
      />
      <TextInput
        id="telegramBotToken"
        placeholder="Enter Telegram Bot Token"
        value={telegramBotToken}
        onChange={setTelegramBotToken}
      />
    </>
  )
}

export default TelegramCredentialsInput
