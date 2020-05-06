require('dotenv').config({
    path: '../../.env'
})
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { program } = require('commander')
const toVersion = (value, dummyPrevious) => {
    const result = parseInt(value)
    if(isNaN(result)){
        console.error(`Invalid version "${value}". Must be integer`)
        process.exit(1)
    }
    return `v${result}`
}

program
.requiredOption('-u, --user <user>', 'name of person/organization that you are creating for')
.requiredOption('-a, --api-version <api-version>', 'api version (integer)', toVersion)
.option('-s, --salt <salt>', 'salt for hashing the api key')
 
program.parse(process.argv)

let { user: name, apiVersion, salt } = program

if(!salt){
    const key = `API_KEY_SALT_${apiVersion.toUpperCase()}`
    if(process.env[key]){
        console.log(`Retrieving salt from env var ${key}`)
        salt = process.env[key]
    }
    else{
        console.error(`No salt was supplied; and could not find env var ${key}. Exiting.`)
        process.exit(1)
    }
}

const generateKey = () => {
    return crypto.randomBytes(32).toString('base64')
  }
  
const generateHash = (value, salt) => {
    return bcrypt.hash(value, salt)
    .then(hashed => hashed)
    .catch(err=>{
        console.error(`Could not generate hash. Exiting. ${err.stack}`)
        process.exit(1)
    })
}

const removeSalt = (hash, salt) =>{
    return hash.replace(salt, '')
}

;(async()=>{
    console.log(`name="${name}" apiVersion="${apiVersion}" salt="${salt}"`)
    
    const key = generateKey()
    const apiKey = `${name}_${apiVersion}_${key}`
    console.log(`\nPlaintext api key:\n${apiKey}`)
    
    const hash = await generateHash(key, salt)
    const transformedHash = removeSalt(hash, salt)
    const apiHash = `${name}_${apiVersion}_${transformedHash}`
    console.log(`\Hashed api key:\n${apiHash}`)

    process.exit()
})()