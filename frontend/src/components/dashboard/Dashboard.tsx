import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { NavBar, TitleBar, PrimaryButton } from 'components/common'
import Campaigns from './campaigns'


const Dashboard = () => {
  return (
    <>
      <NavBar></NavBar>
      <TitleBar title="Welcome, Agency">
        <PrimaryButton>Create new campaign</PrimaryButton>
      </TitleBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
      </Switch>
    </>
  )
}

export default Dashboard