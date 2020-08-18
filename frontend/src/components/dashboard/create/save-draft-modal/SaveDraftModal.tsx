import React from 'react'
import { useHistory } from 'react-router-dom'
import { ConfirmModal } from 'components/common'

const SaveDraftModal = ({
  onSave,
  saveable,
}: {
  onSave?: () => Promise<void> | undefined
  saveable?: boolean
}) => {
  const history = useHistory()

  async function handleOnSaveClicked(): Promise<void> {
    if (onSave) await onSave()
    history.push('/campaigns')
  }

  return saveable ? (
    <ConfirmModal
      title="Would you like to save your draft?"
      subtitle='Your current template will be saved and you can return to it later by selecting the "Create message" step on the navigation bar at the side.'
      buttonText="Save draft"
      cancelText="Skip saving draft"
      onConfirm={handleOnSaveClicked}
      onCancel={() => history.push('/campaigns')}
    />
  ) : (
    <ConfirmModal
      title="Draft cannot be saved"
      subtitle="Drafts for encrypted messages are not saved. Make sure you have stored the template draft somewhere if you would like to keep it."
      buttonText="Back to campaigns"
      onConfirm={() => history.push('/campaigns')}
    />
  )
}

export default SaveDraftModal
