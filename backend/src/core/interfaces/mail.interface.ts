export interface MailToSend {
  recipients: Array<string>;
  subject: string;
  body: string;
}

export interface MailCredentials {
  email: string;
  host?: string;
  port?: string;
  user?: string;
  password?: string;
}