import React, { useEffect, useState } from 'react'
import { OutboundLink } from 'react-ga'
import { GUIDE_TELEGRAM_CREDENTIALS_URL } from 'config'

import { TextInput } from 'components/common'
import styles from '../Create.module.scss'

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
      <h5>
        Telegram Bot Token
        <OutboundLink
          className={styles.inputLabelHelpLink}
          eventLabel={GUIDE_TELEGRAM_CREDENTIALS_URL}
          to={GUIDE_TELEGRAM_CREDENTIALS_URL}
          target="_blank"
        >
          (What&apos;s this?)
        </OutboundLink>
      </h5>
      <TextInput
        placeholder="Enter Telegram Bot Token"
        value={telegramBotToken}
        onChange={setTelegramBotToken}
      />
    </>
  )
}

export default TelegramCredentialsInput
