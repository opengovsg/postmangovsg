import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Landing from './components/landing'
import Dashboard from './components/dashboard'
import './styles/app.scss'

const App = () => {
  return (
    <Router>
      <Route exact path="/" component={Landing}></Route>
      <Route exact path="/dashboard" component={Dashboard}></Route>
    </Router>
  )
}

export default App
