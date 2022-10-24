import { useCallback, useContext, useEffect, useState } from 'react'
import { CampaignStats, Status } from 'classes'
import { CampaignContext } from 'contexts/campaign.context'
import { getCampaignDetails, getCampaignStats } from 'services/campaign.service'

function usePollCampaignStats() {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { id } = campaign
  const [stats, setStats] = useState(new CampaignStats({}))

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
