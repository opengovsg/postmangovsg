export const API_URL =
  process.env.API_URL || 'https://api-staging.postman.gov.sg';
export const API_KEY = process.env.API_KEY as string;
export const MAILBOX = process.env.MAIL_BOX || 'internal-testing@open.gov.sg';

export const DASHBOARD_URL =
  process.env.DASHBOARD_URL || 'http://staging.postman.gov.sg';
export const POSTMAN_FROM = 'donotreply@mail.postman.gov.sg';

export const SMS_NUMBER = process.env.SMS_NUMBER as string;
export const TWILIO_ACC_SID = process.env.TWILIO_ACC_SID as string;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
