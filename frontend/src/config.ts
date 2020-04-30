import axios from 'axios'
export const POSTMAN_GUIDE_URL = 'https://guide.postman.gov.sg'
export const CONTACT_US_URL = 'https://form.gov.sg/#!/5e8db1736d789b0011743202'
export const POSTMAN_API_BASEURL = process.env.REACT_APP_BACKEND_URL as string

// axios global defaults
axios.defaults.baseURL = POSTMAN_API_BASEURL
axios.defaults.withCredentials = true
axios.defaults.timeout = 10000 // 10 seconds