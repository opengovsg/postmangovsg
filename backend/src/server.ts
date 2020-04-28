import getApp from './app'

const port = Number(process.env.PORT) || 4000

const start = async (): Promise<void> => {
  const app = await getApp()
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()
  .catch((err) => {
    console.error(err)
  })