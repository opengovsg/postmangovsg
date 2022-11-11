import { DuplicateCampaignDetails } from '@shared/core/interfaces/campaign.interface'
import { TelegramTemplate } from '@shared/core/models/telegram'

export interface StoreTemplateInput {
  campaignId: number
  body: string
}
export interface StoreTemplateOutput {
  updatedTemplate: TelegramTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

export interface TelegramDuplicateCampaignDetails
  extends DuplicateCampaignDetails {
  telegram_templates: {
    body: string
  }
}
/**
 * @swagger
 *  components:
 *    schemas:
 *
 *      TelegramCampaign:
 *       type: object
 *       properties:
 *         id:
 *          type: number
 *         name:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         has_credential:
 *           type: boolean
 *         valid:
 *           type: boolean
 *         csv_filename:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
 *           default: 'TELEGRAM'
 *         job_queue:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/JobQueue'
 *         telegram_templates:
 *           type: object
 *           properties:
 *            body:
 *              type: string
 *            params:
 *              type: array
 *              items:
 *                type: string
 */
