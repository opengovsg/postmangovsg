import { FormEvent, useRef, useState } from 'react'

import styles from './CreateUpdateModal.module.scss'

import { PrimaryButton, TextButton, TextInput } from 'components/common'
import { ApiKey, generateApiKey, updateApiKey } from 'services/api-key.service'

export const CreateUpdateModal = ({
  onSuccess,
  originalApiKey,
}: {
  onSuccess: (key: ApiKey) => void | Promise<void>
  originalApiKey?: ApiKey
}) => {
  const isUpdateMode = !!originalApiKey
  const [keyLabel, setKeyLabel] = useState<string>(originalApiKey?.label || '')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errMsg, setErrMsg] = useState<string>('')
  const errDisplayTimer = useRef<NodeJS.Timeout | null>(null)
  const [contactList, setContactList] = useState<string[]>(
    originalApiKey?.notification_addresses || ['']
  )
  function displayError(msg: string) {
    setErrMsg(msg)
    if (errDisplayTimer) {
      clearTimeout(errDisplayTimer.current as NodeJS.Timeout)
    }
    errDisplayTimer.current = setTimeout(() => setErrMsg(''), 5000)
  }
  function updateContactList(value: string, index: number) {
    setContactList([
      ...contactList.slice(0, index),
      value.toLowerCase(),
      ...contactList.slice(index + 1),
    ])
  }
  function addNewContact() {
    setContactList([...contactList, ''])
  }
  function removeContact(index: number) {
    setContactList([
      ...contactList.slice(0, index),
      ...contactList.slice(index + 1),
    ])
  }

  function presubmissionCheck(): string | undefined {
    if (isLoading) {
      return 'Another submission is currently being requested'
    }
    if (contactList.length < 1) {
      return 'You must enter at least 1 contact email address'
    }
    const emailRegex =
      /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
    if (contactList.some((v) => !emailRegex.test(v))) {
      return 'One of the contact email addresses is invalid'
    }
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    const presubmissionErr = presubmissionCheck()
    if (presubmissionErr) {
      displayError(presubmissionErr)
      return
    }
    try {
      setIsLoading(true)
      const apiKey = await generateApiKey({
        label: keyLabel,
        notificationAddresses: contactList,
      })
      await onSuccess(apiKey)
    } catch (e) {
      displayError('Something went wrong. Please try again later!')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateSubmit(e: FormEvent) {
    e.preventDefault()
    const presubmissionErr = presubmissionCheck()
    if (presubmissionErr) {
      displayError(presubmissionErr)
      return
    }
    if (!isUpdateMode) {
      return
    }

    try {
      setIsLoading(true)
      const apiKey = await updateApiKey({
        id: originalApiKey.id,
        notificationAddresses: contactList,
      })
      await onSuccess(apiKey)
    } catch (e) {
      displayError('Something went wrong. Please try again later!')
    } finally {
      setIsLoading(false)
    }
  }

  const submitButtonText = {
    loading: isUpdateMode ? 'Updating Key' : 'Generating Key',
    default: isUpdateMode ? 'Update Key' : 'Updating Key',
  }
  return (
    <form onSubmit={isUpdateMode ? handleUpdateSubmit : handleCreateSubmit}>
      <div>
        <h2>
          <label htmlFor="apiKeyLabel">Create a new API key</label>
        </h2>
        <h4>Key Label</h4>
        <p>
          The label you choose for your API key is be permanent and cannot be
          changed once it has been created.
        </p>
        <TextInput
          id="apiKeyLabel"
          type="text"
          placeholder="The label with which you can identify your API key with"
          value={keyLabel}
          onChange={setKeyLabel}
          disabled={isUpdateMode}
        ></TextInput>
        <h4>Contact Emails</h4>
        <p>
          Please provide the email contacts in the event we need to reach out to
          you and your team about your API key.
        </p>
        {contactList.map((c, i) => (
          <div key={i} className={styles.contactContainer}>
            <TextInput
              type="text"
              placeholder="Address we could contact your team with"
              value={c}
              onChange={(v: string) => updateContactList(v, i)}
            />
            {contactList.length > 1 && (
              <TextButton noUnderline onClick={() => removeContact(i)}>
                <i className="bx bx-x"></i>
              </TextButton>
            )}
          </div>
        ))}
        <TextButton
          noUnderline
          className={styles.addContactBtn}
          onClick={addNewContact}
        >
          <i className="bx bx-plus"></i> Add Contact
        </TextButton>
        {errMsg && <p className={styles.errorMessage}>{errMsg}</p>}
      </div>
      <div className="separator"></div>
      <div className="progress-button">
        <PrimaryButton type="submit" disabled={!keyLabel || isLoading}>
          {isLoading ? submitButtonText.loading : submitButtonText.default}
          <i className="bx bx-key"></i>
        </PrimaryButton>
      </div>
    </form>
  )
}
