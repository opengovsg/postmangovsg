import { loggerWithLabel } from '@core/logger'
import { Request, Response } from 'express'
import { ApiKeyService } from '@core/services'

const logger = loggerWithLabel(module)

const listApiKeys = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const userId = req.session?.user?.id
  const apiKeys = await ApiKeyService.getApiKeys(userId.toString())
  return res.status(200).json(apiKeys)
}
const deleteApiKey = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { apiKeyId } = req.params
  const userId = req.session?.user?.id

  const deletedRows = await ApiKeyService.deleteApiKey(
    userId.toString(),
    +apiKeyId
  )
  if (deletedRows == 0) {
    return res.status(404).json({
      code: 'not_found',
      message: `Could not find API key to delete`,
    })
  }
  logger.info({
    message: 'Successfully deleted api key',
    action: 'deleteApiKey',
  })
  return res.status(200).json({
    api_key_id: apiKeyId,
  })
}

export const ApiKeyMiddleware = {
  listApiKeys,
  deleteApiKey,
}
