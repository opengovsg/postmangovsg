export interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  messagingServiceSid: string;
}
/**
 * @swagger
 * components:
 *   schemas:
 *     TwilioCredentials:
 *       type: object
 *       properties:
 *         twilio_account_sid:
 *           type: string
 *         twilio_api_key:
 *           type: string
 *         twilio_api_secret:
 *           type: string
 *         twilio_messaging_service_sid:
 *           type: string
 */