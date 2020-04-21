import axios from 'axios'

interface PresignedUrlResponse {
  presignedUrl: string;
  transactionId: string;
}

interface UploadCompleteResponse {
  template_body: string;
  num_recipients: number;
  hydrated_record: string;
}

export async function saveTemplate(campaignId: number, subject: string, body: string): Promise<boolean> {
  return axios.put(`/campaign/${campaignId}/template`,{
    body,
    subject,
  }).then((response) => {
    return response.status === 200
  })
}

export async function sendPreviewMessage({campaignId, recipient}: {campaignId: number; recipient: string}): Promise<boolean>{
  return axios.post(`/campaign/${campaignId}/credentials`,{
    recipient
  }).then((response) => {
    return response.status === 200
  })
}

export async function getPresignedUrl({
  campaignId,
  mimeType,
}: {
  campaignId: number
  mimeType: string
}): Promise<PresignedUrlResponse> {
  return axios
    .get(`/campaign/${campaignId}/email/upload/start`, {
      params: {
        mimeType,
      },
    })
    .then((resp) => resp.data)
}

export async function completeFileUpload({
  campaignId,
  transactionId,
}: {
  campaignId: number
  transactionId: string
}): Promise<UploadCompleteResponse> {
  return axios
    .post(`/campaign/${campaignId}/email/upload/complete`, {
      transactionId,
    })
    .then((resp) => resp.data)
}


export async function getPreviewMessage(campaignId: number): Promise<string> {
  return Promise.resolve('something hola')
}

export async function sendCampaign(campaignId: number): Promise<boolean> {
  return Promise.resolve(true)
}