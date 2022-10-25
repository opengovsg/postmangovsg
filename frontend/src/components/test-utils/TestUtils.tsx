import { Route, Routes, useLocation } from 'react-router-dom'

import CryptoTest from './CryptoTest'
import TemplateTest from './TemplateTest'

const TestUtils = () => {
  const { pathname } = useLocation()

  return (
    <Routes>
      <Route path={`${pathname}/crypto/*`} element={<CryptoTest />}></Route>
      <Route path={`${pathname}/template/*`} element={<TemplateTest />}></Route>
    </Routes>
  )
}

export default TestUtils
