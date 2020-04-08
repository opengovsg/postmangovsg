import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { NavBar, TitleBar, PrimaryButton } from 'components/common'
import Campaigns from './campaigns'
import Edit from './edit'


const Dashboard = () => {
  return (
    <>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
        <Route path="/campaigns/:id" component={Edit}></Route>
      </Switch>
    </>
  )
}

export default Dashboard