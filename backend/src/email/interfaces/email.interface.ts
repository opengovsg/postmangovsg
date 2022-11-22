import { DuplicateCampaignDetails } from '@core/interfaces/campaign.interface'
import { EmailTemplate } from '@email/models'

export interface StoreTemplateInput {
  campaignId: number
  subject: string
  body: string
  replyTo: string | null
  from: string
  showLogo: boolean
}
export interface StoreTemplateOutput {
  updatedTemplate: EmailTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

export interface EmailDuplicateCampaignDetails
  extends DuplicateCampaignDetails {
  email_templates: {
    body: string
    subject: string
    reply_to: string | null
    from: string
  }
}

/**
 * @swagger
 *  components:
 *    schemas:
 *      EmailMessageTransactional:
 *        type: object
 *        required:
 *          - id
 *          - recipient
 *          - params
 *          - status
 *        properties:
 *          id:
 *            type: string
 *            example: 69
 *          from:
 *            type: string
 *            example: "Postman <donotreply@mail.postman.gov.sg>"
 *          recipient:
 *            type: string
 *            example: hello@example.com
 *          params:
 *            type: object
 *          attachments_metadata:
 *            nullable: true
 *            type: array
 *            items:
 *              type: object
 *              required:
 *                - fileName
 *                - fileSize
 *                - hash
 *              properties:
 *                fileName:
 *                  type: string
 *                fileSize:
 *                  type: number
 *                hash:
 *                  type: string
 *          status:
 *            type: string
 *            enum: [UNSENT, ACCEPTED, SENT, BOUNCED, DELIVERED, OPENED, COMPLAINT]
 *          error_code:
 *            nullable: true
 *            type: string
 *          error_sub_type:
 *            nullable: true
 *            type: string
 *          created_at:
 *            nullable: false
 *            type: string
 *            format: date-time
 *          updated_at:
 *            nullable: true
 *            type: string
 *            format: date-time
 *          accepted_at:
 *            nullable: true
 *            type: string
 *            format: date-time
 *          sent_at:
 *            nullable: true
 *            type: string
 *            format: date-time
 *          delivered_at:
 *            nullable: true
 *            type: string
 *            format: date-time
 *          opened_at:
 *            nullable: true
 *            type: string
 *            format: date-time
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
 *         protect:
 *           type: boolean
 *         redacted:
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
