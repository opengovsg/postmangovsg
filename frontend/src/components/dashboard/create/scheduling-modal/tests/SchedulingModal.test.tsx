import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SchedulingModal from '../SchedulingModal'

import { Campaign } from 'classes'
import { confirmSendCampaign } from 'components/dashboard/create/util'
import ModalContextProvider from 'contexts/modal.context'

jest.mock('components/dashboard/create/util', () => ({
  confirmSendCampaign: jest.fn(),
}))

test('rescheduling without edits keeps the existing schedule', async () => {
  ;(confirmSendCampaign as jest.Mock).mockResolvedValue(undefined)
  const scheduledAt = new Date(new Date().getFullYear() + 1, 1, 14, 10, 0)
  const campaign = { id: 1, name: 'Test', scheduledAt } as unknown as Campaign

  render(
    <ModalContextProvider>
      <SchedulingModal campaign={campaign} updateCampaign={jest.fn()} />
    </ModalContextProvider>
  )
  await userEvent.click(screen.getByText(/schedule campaign/i))

  expect(confirmSendCampaign).toHaveBeenCalledWith(
    expect.objectContaining({ scheduledTiming: scheduledAt })
  )
})
