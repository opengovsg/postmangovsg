import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import 'promise-polyfill/src/polyfill'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
