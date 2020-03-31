import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { ThemeProvider } from '@material-ui/core/styles'

// Material UI custom theme
import theme from './App.style'

import Landing from './components/landing'

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Route exact path="/" component={Landing}></Route>
      </Router>
    </ThemeProvider>
  )
}

export default App
