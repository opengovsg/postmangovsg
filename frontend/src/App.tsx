import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'

// Components
import Landing from 'components/landing'
import Login from 'components/login'
import ProtectedPage from 'components/protected'
import CryptoTest from 'components/cryptoTest'
import Unsubscribe from 'components/unsubscribe'

// Contexts
import AuthContextProvider from 'contexts/auth.context'

import './styles/app.scss'

// lazy load admin dashboard views
import ProtectedRoute from 'routes/protected.route'
const Dashboard = lazy(() => import('components/dashboard'))

const App = () => {
  return (
    <Router>
      <AuthContextProvider>
        <Switch>
          <Route exact path="/" component={Landing}></Route>
          <Route exact path="/login" component={Login}></Route>
          <Route exact path="/crypto-test" component={CryptoTest}></Route>
          <Route exact path="/p/:version/:id" component={ProtectedPage}></Route>
          <Route
            exact
            path="/unsubscribe/:version"
            component={Unsubscribe}
          ></Route>
          <ProtectedRoute>
            <Suspense
              fallback={<i className="spinner bx bx-loader-alt bx-spin"></i>}
            >
              <Dashboard></Dashboard>
            </Suspense>
          </ProtectedRoute>
        </Switch>
      </AuthContextProvider>
    </Router>
  )
}

export default App
