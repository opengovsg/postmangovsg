const ArgumentParser = require('argparse').ArgumentParser
const parser = new ArgumentParser({ addHelp:true })
const crypto = require('crypto')
const bcrypt = require('bcrypt')

parser.addArgument(
  [ '-s', '--salt' ],
  {
    help: 'salt for hashing the api key',
    required: true,
  }
)

parser.addArgument(
  [ '-v', '--version' ],
  {
    help: 'api version',
    required: true,
  }
)

parser.addArgument(
  [ '-n', '--name' ],
  {
    help: 'name of person/organization that you are creating for',
    required: true,
  }
)

const generateKey = () => {
  return crypto.randomBytes(32).toString('hex')
}

const generateHash = (value, salt) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(value, salt, (error, hash) => {
      if (error) {
        console.error(`Failed to hash value: ${error}`)
        reject(error)
      }
      resolve(hash)
    })
  }) 
}

( async () => {
  const { salt, version, name } = parser.parseArgs()
  const key = generateKey()
  const apiKey = `${name}_v${version}_${key}`
  console.log(`\nPass this to developer:\n ${apiKey}`)
  const hash = await generateHash(key, salt)
  const apiHash = `${name}_v${version}_${hash}`
  console.log(`\nStore inside api_key table:\n ${apiHash}\n`)
  process.exit()
})()