import axios from 'axios'

async function getLandingStats(): Promise<number | undefined> {
  try {
    const response = await axios.get('/stats')
    return response.data?.sent
  } catch (e) {
    console.error(e)
  }
}

export {
  getLandingStats
}