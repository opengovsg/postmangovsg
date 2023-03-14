export const API_URL =
  process.env.API_URL || 'https://api-staging.postman.gov.sg';
export const API_KEY = process.env.API_KEY as string;
export const MAILBOX = process.env.MAIL_BOX || 'internal-testing@open.gov.sg';

export const DASHBOARD_URL =
  process.env.CYPRESS_BASE_URL || 'http://staging.postman.gov.sg';
export const POSTMAN_FROM = 'donotreply@mail.postman.gov.sg';
