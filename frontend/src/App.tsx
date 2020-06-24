import React from 'react'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom'

// Components
import Landing from 'components/landing'
import Dashboard from 'components/dashboard'
import Login from 'components/login'
import ProtectedPage from 'components/protected'

// Routes HOC
import ProtectedRoute from 'routes/protected.route'

// Contexts
import AuthContextProvider from 'contexts/auth.context'

import './styles/app.scss'

const App = () => {
  return (
    <Router>
      <AuthContextProvider>
        <Switch>
          <Route exact path="/" component={Landing}></Route>
          <Route exact path="/login" component={Login}></Route>
          <Redirect exact from="/protected" to="/" />
          <Route exact path="/protected/:id" component={ProtectedPage}></Route>
          <ProtectedRoute>
            <Dashboard></Dashboard>
          </ProtectedRoute>
        </Switch>
      </AuthContextProvider>
    </Router>
  )
}

export default App
