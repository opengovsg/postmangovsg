import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Switch, useLocation } from 'react-router-dom'

// Components
import Landing from 'components/landing'
import Dashboard from 'components/dashboard'
import Error from 'components/error'

// Routes HOC
import ProtectedRoute from 'routes/protected.route'

// Contexts
import AuthContextProvider from 'contexts/auth.context'

// Service
import { initializeGA, sendPageView } from 'services/ga.service'

import './styles/app.scss'

const GA = () => {
  let location = useLocation();

  useEffect(() => {
    sendPageView(location.pathname)
  }, [location]);

  useEffect(() => {
    initializeGA()
  })

  return <></>
}


const App = () => {
  return (
    <Router>
      <GA></GA>
      <AuthContextProvider>
        <Switch>
          <Route exact path="/" component={Landing}></Route>
          <ProtectedRoute>
            <Dashboard></Dashboard>
          </ProtectedRoute>
          <Route component={Error} />
        </Switch>
      </AuthContextProvider>
    </Router>
  )
}

export default App
