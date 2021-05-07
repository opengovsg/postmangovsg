import { Switch, Route } from 'react-router-dom'

import Campaigns from './campaigns'

import Create from './create'

import Settings from './settings'

import { InfoBanner, NavBar } from 'components/common'
import Error from 'components/error'
import { INFO_BANNER } from 'config'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterContextProvider from 'contexts/finish-later.modal.context'
import ModalContextProvider from 'contexts/modal.context'

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
