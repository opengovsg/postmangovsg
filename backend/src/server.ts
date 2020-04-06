import app from './app'

require('dotenv').config()

const port = Number(process.env.PORT) || 4000


app.listen(port, () => console.log(`Listening on port ${port}!`))
