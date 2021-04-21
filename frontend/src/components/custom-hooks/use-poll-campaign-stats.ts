import { CampaignStats, Status } from 'classes'
import { useState, useEffect, useCallback, useContext } from 'react'
import { getCampaignStats, getCampaignDetails } from 'services/campaign.service'
import { CampaignContext } from 'contexts/campaign.context'

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
    poll()

    return () => clearTimeout(timeoutId)
  }, [refreshCampaignStats, id, setCampaign])

  return { stats, refreshCampaignStats }
}

export default usePollCampaignStats
