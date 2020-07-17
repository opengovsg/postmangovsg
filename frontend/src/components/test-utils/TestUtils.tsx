import React from 'react'
import { Switch, Route, useRouteMatch } from 'react-router-dom'

import CryptoTest from './CryptoTest'
import TemplateTest from './TemplateTest'

const TestUtils = () => {
  const { url } = useRouteMatch()

  return (
    <Switch>
      <Route path={`${url}/crypto`} component={CryptoTest}></Route>
      <Route path={`${url}/template`} component={TemplateTest}></Route>
    </Switch>
  )
}

export default TestUtils
