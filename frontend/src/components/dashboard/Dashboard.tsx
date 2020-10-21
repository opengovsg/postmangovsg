import React from 'react'
import { Switch, Route } from 'react-router-dom'

import ModalContextProvider from 'contexts/modal.context'
import CampaignContextProvider from 'contexts/campaign.context'
import Error from 'components/error'
import { NavBar } from 'components/common'
import Campaigns from './campaigns'
import Create from './create'
import Settings from './settings'

const Dashboard = () => {
  console.log('Dashboard')
  return (
    <ModalContextProvider>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
        <CampaignContextProvider>
          <Route path="/campaigns/:id" component={Create}></Route>
        </CampaignContextProvider>
        <Route path="/settings" component={Settings}></Route>
        <Route component={Error} />
      </Switch>
    </ModalContextProvider>
  )
}

export default Dashboard
