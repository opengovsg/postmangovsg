import React from 'react'
import { Switch, Route } from 'react-router-dom'

import ModalContextProvider from 'contexts/modal.context'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterContextProvider from 'contexts/finish-later.modal.context'
import Error from 'components/error'
import { InfoBanner, NavBar } from 'components/common'
import Campaigns from './campaigns'
import Create from './create'
import Settings from './settings'
import { INFO_BANNER } from 'config'

const Dashboard = () => {
  return (
    <ModalContextProvider>
      <InfoBanner>{INFO_BANNER}</InfoBanner>
      <NavBar></NavBar>
      <Switch>
        <Route exact path="/campaigns" component={Campaigns}></Route>
        <Route path="/campaigns/:id">
          <CampaignContextProvider>
            <FinishLaterContextProvider>
              <Create />
            </FinishLaterContextProvider>
          </CampaignContextProvider>
        </Route>
        <Route path="/settings" component={Settings}></Route>
        <Route component={Error} />
      </Switch>
    </ModalContextProvider>
  )
}

export default Dashboard
