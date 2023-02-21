import { useCallback, useContext, useEffect, useState } from 'react'

import { CampaignStats, Status } from 'classes'
import { CampaignContext } from 'contexts/campaign.context'
import { getCampaignDetails, getCampaignStats } from 'services/campaign.service'

function usePollCampaignStats() {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { id } = campaign
  const [stats, setStats] = useState(new CampaignStats({}))
  // one time flag to enforce that it refreshes once per poll only. if not you will have state jumping problems.
  // const [oneTime, setOneTime] = useState<boolean>(false)

  const refreshCampaignStats = useCallback(
    async (forceRefresh = false) => {
      const updatedStats = await getCampaignStats(id, forceRefresh)
      setStats(updatedStats)
      return updatedStats
    },
    [id]
  )

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function poll() {
      const { status } = await refreshCampaignStats()
      // if scheduled, just load once and exit.
      if (status === Status.Scheduled) {
        const updatedCampaign = await getCampaignDetails(id)
        setCampaign(updatedCampaign)
        return
      }
      // if anything else, do infinite polling
      if (status !== Status.Sent) {
        timeoutId = setTimeout(poll, 2000)
      } else {
        const updatedCampaign = await getCampaignDetails(id)
        setCampaign(updatedCampaign)
      }
    }

    void poll()

    return () => clearTimeout(timeoutId)
  }, [stats.status, refreshCampaignStats, id, setCampaign])

  return { stats, refreshCampaignStats }
}

export default usePollCampaignStats
