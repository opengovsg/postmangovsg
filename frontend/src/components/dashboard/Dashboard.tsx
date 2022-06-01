import { createRef, useEffect } from 'react'
import { Switch, Route } from 'react-router-dom'

import Campaigns from './campaigns'

import Create from './create'

import Settings from './settings'

import { InfoBanner, NavBar } from 'components/common'
import Error from 'components/error'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterContextProvider from 'contexts/finish-later.modal.context'
import ModalContextProvider from 'contexts/modal.context'

const Dashboard = () => {
  const infoBannerRef = createRef<HTMLDivElement>()

  useEffect(() => {
    function recalculateBannerPos() {
      const scrollTop = (document.documentElement.scrollTop ||
        document.body.scrollTop) as number
      if (infoBannerRef.current) {
        const infoBannerHeight = infoBannerRef.current?.offsetHeight as number
        if (scrollTop > infoBannerHeight) {
          infoBannerRef.current.style.position = 'fixed'
        } else {
          infoBannerRef.current.style.position = 'relative'
        }
      }
    }
    window.addEventListener('scroll', recalculateBannerPos)
    return () => {
      window.removeEventListener('scroll', recalculateBannerPos)
    }
  })

  return (
    <ModalContextProvider>
      <InfoBanner innerRef={infoBannerRef} />
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
