import { GovsgStatsService } from '@govsg/services'
import { Request, Response } from 'express'

export async function getStats(req: Request, res: Response): Promise<Response> {
  const stats = await GovsgStatsService.getStats(+req.params.campaignId)
  return res.json(stats)
}

export async function updateAndgetStats(
  req: Request,
  res: Response
): Promise<Response> {
  const campaignId = +req.params.campaignId
  await GovsgStatsService.refreshStats(campaignId)
  const stats = await GovsgStatsService.getStats(campaignId)
  return res.json(stats)
}

export async function getDeliveredRecipients(
  req: Request,
  res: Response
): Promise<Response> {
  res.set('Content-Type', 'application/json')
  await GovsgStatsService.getDeliveredRecipients(+req.params.campaignId, res)
  return res.end()
}
