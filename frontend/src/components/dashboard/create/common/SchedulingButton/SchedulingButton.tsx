import cx from 'classnames'

import { MouseEvent as ReactMouseEvent, useContext } from 'react'

import { Campaign } from 'classes'
import { ActionButton } from 'components/common'

import styles from 'components/common/export-recipients/ExportRecipients.module.scss'
import SchedulingModal from 'components/dashboard/create/scheduling-modal'
import { ModalContext } from 'contexts/modal.context'

const SchedulingButton = ({
  campaign,
  updateCampaign,
  buttonText,
}: {
  campaign: Campaign
  updateCampaign: (campaign: Partial<Campaign>) => void
  buttonText: string
}) => {
  const modalContext = useContext(ModalContext)

  async function openSchedulingModal(
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) {
    event.stopPropagation()
    modalContext.setModalContent(
      <SchedulingModal campaign={campaign} updateCampaign={updateCampaign} />
    )
  }

  return (
    <>
      <ActionButton>
        <div
          onClick={async (e) => {
            await openSchedulingModal(e)
          }}
        >
          {buttonText}
          <div>
            <i className={cx(styles.icon, 'bx bx-calendar-event')}></i>
          </div>
        </div>
      </ActionButton>
    </>
  )
}

export default SchedulingButton
