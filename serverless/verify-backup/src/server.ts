import express from 'express'
import bodyParser from 'body-parser'

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

app.listen(PORT, () =>
  console.log(`PubSub server is listening on port ${PORT}`)
);
