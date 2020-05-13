export interface MailToSend {
  recipients: Array<string>;
  subject: string;
  body: string;
}

export interface MailCredentials {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  }; 
}