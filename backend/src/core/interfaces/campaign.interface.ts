import { ChannelType } from '@core/constants'

export interface CampaignInterface {
    name:  string;
    userId: number;
    type: ChannelType;
    credName? : string;
    s3Object?: object;
    valid: boolean;
}