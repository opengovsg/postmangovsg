import getApp from './app'

require('dotenv').config()

const port = Number(process.env.PORT) || 4000

const start = async () => {
  const app = await getApp()
  app.listen(port, () => console.log(`Listening on port ${port}!`))
} 

start()
