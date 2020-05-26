import React from 'react'
import { Switch, Route } from 'react-router-dom'

import ModalContextProvider from 'contexts/modal.context'
import { NavBar } from 'components/common'
import Campaigns from './campaigns'
import Create from './create'
import Settings from './settings'


const Dashboard = () => {
  return (
    <ModalContextProvider>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
        <Route path="/campaigns/:id" component={Create}></Route>
        <Route path="/settings" component={Settings}></Route>
      </Switch>
    </ ModalContextProvider>
  )
}

export default Dashboard
