import { useState, useContext } from 'react'

import { useNavigate } from 'react-router-dom'

import { ConfirmModal } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

const SaveDraftModal = ({
  onSave,
  saveable,
}: {
  onSave?: () => Promise<void> | undefined
  saveable?: boolean
}) => {
  const navigate = useNavigate()
  const modalContext = useContext(ModalContext)
  const [error, setError] = useState('')

  async function handleOnSaveClicked(): Promise<void> {
    try {
      if (onSave) await onSave()
      navigate('/campaigns')
    } catch (err) {
      setError((err as Error).message)
      // Propagate error so that ConfirmModal will display the error message
      throw err
    }
  }

  function handleEditDraft(): void {
    // Dismiss modal
    modalContext.close()
  }

  return saveable ? (
    <ConfirmModal
      title="Would you like to save your draft?"
      subtitle='Your current template will be saved and you can return to it later by selecting the "Create message" step on the navigation bar at the side.'
      buttonText={error ? 'Edit draft' : 'Save draft'}
      cancelText="Skip saving draft"
      onConfirm={error ? handleEditDraft : handleOnSaveClicked}
      onCancel={() => navigate('/campaigns')}
    />
  ) : (
    <ConfirmModal
      title="Draft cannot be saved"
      subtitle="Drafts for encrypted messages are not saved. Make sure you have stored the template draft somewhere if you would like to keep it."
      buttonText="Back to campaigns"
      onConfirm={() => navigate('/campaigns')}
    />
  )
}

export default SaveDraftModal
