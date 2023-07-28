import { Request, Response } from 'express'
import { GovsgMessage } from '@govsg/models'
import { GovsgVerification } from '@govsg/models/govsg-verification'

export const listMessages = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { campaignId } = req.params
  const { offset, limit } = req.query
  const { rows, count } = await GovsgMessage.findAndCountAll({
    where: {
      campaignId: +campaignId,
    },
    offset: +(offset as string),
    limit: +(limit as string),
    include: [
      {
        model: GovsgVerification,
        attributes: ['passcode'],
      },
    ],
  })
  const messages = rows.map((row) => {
    const {
      agency,
      recipient,
      officer_name,
      recipient_name,
      officer_designation,
      ...remainingParams
    } = row.params as any
    console.debug(
      `Excluding agency=${agency} and officer_designation=${officer_designation} from params=${JSON.stringify(
        row.params
      )}`
    )
    return {
      ...row.get({ plain: true }),
      name: recipient_name,
      mobile: recipient,
      data: JSON.stringify(remainingParams),
      passcode: row.govsgVerification?.passcode ?? '****',
      sent: row.sendAttemptedAt,
      officer: officer_name,
    }
  })
  return res.json({
    messages,
    total_count: count,
  })
}
