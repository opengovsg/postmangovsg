export enum ChannelType {
  SMS = 'sms',
  Email = 'email'
}

/**
 * @swagger
 *  components:
 *    schemas:
 *      ChannelType:
 *        type: string
 *        enum:
 *        - sms
 *        - email
 *      
 *      Project:
 *        type: object
 * 
 *      ProjectMeta:
 *        type: object
 *        properties:
 *          name: 
 *            type: string
 *          createdAt: 
 *            type: string
 *            format: date-time
 *          status:
 *            type: string
 *          type:
 *            $ref: '#/components/schemas/ChannelType'
 */

