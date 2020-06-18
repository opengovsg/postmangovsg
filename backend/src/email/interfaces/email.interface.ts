import { EmailTemplate } from '@email/models'

export interface StoreTemplateInput {
  campaignId: number
  subject: string
  body: string
  replyTo: string | null
}
export interface StoreTemplateOutput {
  updatedTemplate: EmailTemplate
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
 *      EmailCampaign:
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
 *           default: 'EMAIL'
 *         job_queue:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/JobQueue'
 *         email_templates:
 *           type: object
 *           properties:
 *            body:
 *              type: string
 *            subject:
 *              type: string
 *            params:
 *              type: array
 *              items:
 *                type: string
 */
