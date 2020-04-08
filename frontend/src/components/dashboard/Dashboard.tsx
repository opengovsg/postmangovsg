import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { NavBar } from 'components/common'
import Campaigns from './campaigns'
import Create from './create'


const Dashboard = () => {
  return (
    <>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
        <Route path="/campaigns/:id" component={Create}></Route>
      </Switch>
    </>
  )
}

export default Dashboard