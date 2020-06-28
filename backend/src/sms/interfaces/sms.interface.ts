import { SmsTemplate } from '@sms/models'

export interface StoreTemplateInput {
  campaignId: number
  body: string
}
export interface StoreTemplateOutput {
  updatedTemplate: SmsTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

/**
 * @swagger
 *  components:
 *    schemas:
 *
 *      SMSCampaign:
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
 *         is_csv_processing:
 *           type: boolean
 *         num_recipients:
 *           type: number
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
 *           default: 'SMS'
 *         job_queue:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/JobQueue'
 *         sms_templates:
 *           type: object
 *           properties:
 *            body:
 *              type: string
 *            params:
 *              type: array
 *              items:
 *                type: string
 */
