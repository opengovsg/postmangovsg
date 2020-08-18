import React from 'react'
import { useHistory } from 'react-router-dom'
import { ConfirmModal } from 'components/common'

const SaveDraftModal = ({
  onSave,
}: {
  onSave?: () => Promise<void> | undefined
}) => {
  const history = useHistory()

  async function handleOnSaveClicked(): Promise<void> {
    if (onSave) await onSave()
    history.push('/campaigns')
  }

  return (
    <ConfirmModal
      title="Would you like to save your draft?"
      subtitle='Your current template will be saved and you can return to it later by selecting the "Create message" step on the navigation bar at the side.'
      buttonText="Save draft"
      cancelText="Skip saving draft"
      onConfirm={handleOnSaveClicked}
      onCancel={() => history.push('/campaigns')}
    />
  )
}

export default SaveDraftModal
