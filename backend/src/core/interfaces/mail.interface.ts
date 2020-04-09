export interface MailToSend {
  recipients: Array<string>;
  subject: string;
  body: string;
}

export interface MailCredentials {
  host?: string;
  port?: string;
  user?: string;
  password?: string;
}