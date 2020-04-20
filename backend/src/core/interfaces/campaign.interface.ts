import { ChannelType } from '@core/constants'

export interface CampaignS3ObjectInterface {
    key: string;
    bucket: string;
}

export interface CampaignInterface {
    name:  string;
    userId: number;
    type: ChannelType;
    credName? : string;
    s3Object?: CampaignS3ObjectInterface;
    valid: boolean;
}
