import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import OneGovSgStart from '../OneGovSgStart'

jest.mock('config', () => ({ ONE_GOV_SG_ENABLED: false }))

test('clears window.name on landing', () => {
  window.name = 'stale-menlo-state'
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<OneGovSgStart />} />
        <Route path="/login" element={null} />
      </Routes>
    </MemoryRouter>
  )
  expect(window.name).toBe('')
})
