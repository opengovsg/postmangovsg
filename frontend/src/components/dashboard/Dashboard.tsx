import { createRef, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { InfoBanner, NavBar } from 'components/common'
import Error from 'components/error'
import CampaignContextProvider from 'contexts/campaign.context'
import FinishLaterContextProvider from 'contexts/finish-later.modal.context'
import ModalContextProvider from 'contexts/modal.context'

import Campaigns from './campaigns'
import Create from './create'
import Settings from './settings'

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
      <Routes>
        <Route path="/campaigns" element={<Campaigns />}></Route>
        <Route
          path="/campaigns/:id/*"
          element={
            <CampaignContextProvider>
              <FinishLaterContextProvider>
                <Create />
              </FinishLaterContextProvider>
            </CampaignContextProvider>
          }
        />
        <Route path="/settings/*" element={<Settings />} />
        <Route element={<Error />} />
      </Routes>
    </ModalContextProvider>
  )
}

export default Dashboard
