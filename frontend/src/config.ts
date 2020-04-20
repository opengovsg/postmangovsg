import axios from 'axios'
export const POSTMAN_GUIDE_URL = 'https://guide.postman.gov.sg'
export const POSTMAN_API_BASEURL = process.env.REACT_APP_BACKEND_URL as string

// axios global defaults
axios.defaults.baseURL = POSTMAN_API_BASEURL
axios.defaults.withCredentials = true
axios.defaults.timeout = 3000 // 3 seconds