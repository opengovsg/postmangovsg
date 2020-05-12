import { SmsTemplate } from '@sms/models'

export interface StoreTemplateInput {
    campaignId: number;
    body: string;
  }
export interface StoreTemplateOutput {
    updatedTemplate: SmsTemplate;
    numRecipients: number;
    check?: {
      reupload: boolean;
      extraKeys?: string[];
    };
    valid?: boolean;
}