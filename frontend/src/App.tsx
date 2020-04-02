import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Landing from './components/landing'
import AppBase from './components/appBase'
import './styles/app.scss'

const App = () => {
  return (
    <Router>
      <Route exact path="/" component={Landing}></Route>
      <Route exact path="/app" component={AppBase}></Route>
    </Router>
  )
}

export default App
