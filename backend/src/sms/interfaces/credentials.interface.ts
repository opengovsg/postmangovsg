export interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  messagingServiceSid: string;
}
/**
 * @swagger
 *  components:
 *    schemas:
 *      TwilioCredentials:
 *        type: object
 *        properties:
 *          accountSid:
 *            type: string
 *          apiKey:
 *            type: string
 *          apiSecret:
 *            type: string
 *          messagingServiceSid:
 *            type: string
 */