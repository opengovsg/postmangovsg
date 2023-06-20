import axios from 'axios'

// Use REACT_APP_IMG_SERVER_URL to override the BACKEND URL if we need to proxy
const imageServerUrl =
  process.env.REACT_APP_IMG_SERVER_URL || process.env.REACT_APP_BACKEND_URL

export async function uploadCommonCampaignAttachment(
  file: File
): Promise<string> {
  const data = new FormData()
  data.set('attachments', file)
  const res = await axios.post('/attachments', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return `${imageServerUrl}/attachments/${res.data.id}/${res.data.original_file_name}`
}
