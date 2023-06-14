import axios from 'axios'

export async function uploadCommonCampaignAttachment(
  file: File
): Promise<string> {
  const data = new FormData()
  data.set('attachments', file)
  const res = await axios.post('/attachments', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return `${process.env.REACT_APP_BACKEND_URL}/attachments/${res.data.id}/${res.data.original_file_name}`
}
