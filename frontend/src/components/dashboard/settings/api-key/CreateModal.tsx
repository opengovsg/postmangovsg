import { useState } from 'react'

import styles from './CreateModal.module.scss'

import { PrimaryButton, TextInput } from 'components/common'
import { ApiKey, generateApiKey } from 'services/api-key.service'

export const CreateModal = ({
  onSuccess,
}: {
  onSuccess: (key: ApiKey) => void | Promise<void>
}) => {
  const [keyLabel, setKeyLabel] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (isLoading) {
          return
        }

        void (async () => {
          try {
            setIsLoading(true)
            const apiKey = await generateApiKey({ label: keyLabel })
            await onSuccess(apiKey)
          } catch (e) {
            console.log(e)
            setIsError(true)
            setTimeout(() => setIsError(false), 5000)
          } finally {
            setIsLoading(false)
          }
        })()
      }}
    >
      <div>
        <h2>
          <label htmlFor="apiKeyLabel">Create a new API key</label>
        </h2>
        <h4>Key Name</h4>
        <p>
          The name you choose for your API key will be permanent and cannot be
          changed once it has been created.
        </p>
        <TextInput
          id="apiKeyLabel"
          type="text"
          placeholder="Give your key a reference name"
          value={keyLabel}
          onChange={setKeyLabel}
        ></TextInput>
        {isError && (
          <p className={styles.errorMessage}>
            Something went wrong. Please try again later!
          </p>
        )}
      </div>
      <div className="separator"></div>
      <div className="progress-button">
        <PrimaryButton type="submit" disabled={!keyLabel || isLoading}>
          {isLoading ? 'Generating Key' : 'Generate Key'}
          <i className="bx bx-key"></i>
        </PrimaryButton>
      </div>
    </form>
  )
}
