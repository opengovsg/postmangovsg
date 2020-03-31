import React from "react";
import {
  BrowserRouter as Router,
  Route,
} from "react-router-dom";

import Landing from './components/landing'

function App() {
  return (
    <Router>
      <Route exact path="/" component={Landing}></Route>
    </Router>
  );
}

export default App;
