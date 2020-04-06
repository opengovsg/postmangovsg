import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { NavBar } from 'components/common'
import CampaignContextProvider from 'contexts/campaign.context'
import Campaigns from './campaigns'


const Dashboard = () => {
  return (
    <>
      <NavBar></NavBar>
      <Switch>
        <CampaignContextProvider>
          <Route exact path="/campaigns" component={Campaigns}></Route>
        </CampaignContextProvider>
      </Switch>
    </>
  )
}

export default Dashboard
