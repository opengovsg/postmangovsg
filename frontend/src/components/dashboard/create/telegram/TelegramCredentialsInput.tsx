import React, { useEffect, useState } from 'react'

import { TextInput } from 'components/common'

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
      <h5>Telegram Bot Token</h5>
      <TextInput
        placeholder="Enter Telegram Bot Token"
        value={telegramBotToken}
        onChange={setTelegramBotToken}
      />
    </>
  )
}

export default TelegramCredentialsInput
