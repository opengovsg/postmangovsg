// Components
import { Suspense, lazy } from 'react'

import { Route, Routes } from 'react-router-dom'

import Landing from 'components/landing'
import Login, { Callback } from 'components/login'
import ProtectedPage from 'components/protected'
import TestUtils from 'components/test-utils'
import Unsubscribe from 'components/unsubscribe'

import './styles/app.scss'

// HOC
import ProtectedRoute from 'routes/protected.route'

// lazy loaded components
const Dashboard = lazy(() => import('components/dashboard'))

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />}></Route>
      <Route path="/ogp-login/callback" element={<Callback />}></Route>
      <Route path="/ogp-login" element={<Login />}></Route>
      <Route path="/login" element={<Login />}></Route>
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
  )
}

export default App
