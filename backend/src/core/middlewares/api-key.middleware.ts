import { loggerWithLabel } from '@core/logger'
import { Handler, Request, Response } from 'express'
import { ApiKeyService, CredentialService } from '@core/services'
import { ApiKey } from '@core/models'
import { ApiNotFoundError } from '@core/errors/rest-api.errors'

const logger = loggerWithLabel(module)

export interface ApiKeyMiddleware {
  listApiKeys: Handler
  deleteApiKey: Handler
  generateApiKey: Handler
  updateApiKey: Handler
}

export const InitApiKeyMiddleware = (
  credentialService: CredentialService
): ApiKeyMiddleware => {
  const listApiKeys = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const userId = req.session?.user?.id
    const apiKeys = await ApiKeyService.getApiKeys(userId.toString())
    return res.status(200).json(apiKeys.map(convertApiKeyModelToResponse))
  }
  const deleteApiKey = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { apiKeyId } = req.params
    const userId = req.session?.user?.id

    const deletedRows = await ApiKeyService.deleteApiKey(
      userId.toString(),
      +apiKeyId
    )
    if (deletedRows === 0) {
      throw new ApiNotFoundError('Could not find API key to delete')
    }
    logger.info({
      message: 'Successfully deleted api key',
      action: 'deleteApiKey',
    })
    return res.status(200).json({
      id: apiKeyId,
    })
  }
  const generateApiKey = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const userId = req.session?.user?.id
    const apiKey = await credentialService.generateApiKey(
      +userId,
      req.body.label,
      req.body.notification_contacts
    )
    return res.status(201).json(convertApiKeyModelToResponse(apiKey))
  }
  const updateApiKey = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const userId = req.session?.user?.id
    const apiKeyId = req.params.apiKeyId
    const apiKey = await ApiKey.findOne({
      where: {
        userId: userId.toString(),
        id: +apiKeyId,
      },
    })
    if (!apiKey) {
      return res.status(404).json({
        code: 'not_found',
        message: `API key with ID ${apiKeyId} doesn't exist.`,
      })
    }
    apiKey.set('notificationContacts', req.body.notification_contacts)
    await apiKey.save()
    return res.status(200).json(convertApiKeyModelToResponse(apiKey))
  }

  function convertApiKeyModelToResponse(
    key: ApiKey & { plainTextKey?: string }
  ) {
    return {
      id: key.id,
      last_five: key.lastFive,
      label: key.label,
      plain_text_key: key.plainTextKey,
      valid_until: key.validUntil.toISOString(),
      notification_contacts: key.notificationContacts,
    }
  }

  return {
    listApiKeys,
    deleteApiKey,
    generateApiKey,
    updateApiKey,
  }
}
