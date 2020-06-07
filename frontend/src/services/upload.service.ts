import axios, { AxiosError } from 'axios'

export async function uploadFileWithPresignedUrl(
  uploadedFile: File,
  presignedUrl: string
): Promise<void> {
  try {
    await axios.put(presignedUrl, uploadedFile, {
      headers: { 'Content-Type': uploadedFile.type },
      withCredentials: false,
      timeout: 0,
    })
    return
  } catch (e) {
    errorHandler(e)
  }
}

export async function deleteCsvStatus(campaignId: number): Promise<void> {
  try {
    await axios.delete(`/campaign/${campaignId}/upload/status`)
  } catch (e) {
    // No need to throw an error
    console.error('Error deleting csv error status', e)
  }
}

function errorHandler(e: AxiosError, defaultMsg?: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
