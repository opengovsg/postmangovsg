import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { NavBar } from 'components/common'
import Campaigns from './campaigns'


const Dashboard = () => {
  return (
    <>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
      </Switch>
    </>
  )
}

export default Dashboard
