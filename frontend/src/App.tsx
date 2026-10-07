// Components
import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import Landing from 'components/landing'
import Login from 'components/login'
import OneGovSgLogoutToast from 'components/login/OneGovSgLogoutToast'
import OneGovSgStart from 'components/login/OneGovSgStart'
import ProtectedPage from 'components/protected'
import TestUtils from 'components/test-utils'
import Unsubscribe from 'components/unsubscribe'
import { ONE_GOV_SG_CALLBACK_PATH, ONE_GOV_SG_START_PATH } from 'config'

import './styles/app.scss'

// HOC
import ProtectedRoute from 'routes/protected.route'

// lazy loaded components
const Dashboard = lazy(() => import('components/dashboard'))

const App = () => {
  return (
    <>
      <OneGovSgLogoutToast />
      <Routes>
        <Route path="/" element={<Landing />}></Route>
        <Route path="/login" element={<Login />}></Route>
        <Route path={ONE_GOV_SG_START_PATH} element={<OneGovSgStart />}></Route>
        <Route path={ONE_GOV_SG_CALLBACK_PATH} element={<Login />}></Route>
        <Route path="/test/*" element={<TestUtils />}></Route>
        <Route path="/p/:version/:id" element={<ProtectedPage />}></Route>
        <Route path="/unsubscribe/:version" element={<Unsubscribe />}></Route>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Suspense
                fallback={<i className="spinner bx bx-loader-alt bx-spin"></i>}
              >
                <Dashboard></Dashboard>
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
