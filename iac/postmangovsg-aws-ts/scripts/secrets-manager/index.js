const AWS = require('aws-sdk')

const source = {
    accessKey : process.env.SOURCE_ACCESS_KEY,
    secret: process.env.SOURCE_SECRET,
    region: process.env.SOURCE_REGION
}

const dest = {
    accessKey : process.env.DEST_ACCESS_KEY,
    secret: process.env.DEST_SECRET,
    region: process.env.DEST_REGION
}

const sourceMgr = new AWS.SecretsManager({
    region: source.region,
    accessKeyId: source.accessKey,
    secretAccessKey: source.secret
  })
  
const destMgr = new AWS.SecretsManager({
    region: dest.region,
    accessKeyId: dest.accessKey,
    secretAccessKey: dest.secret
})
  
  ;(async () => {
    let secrets = await sourceMgr.listSecrets().promise()
    let secretList =  secrets.SecretList
    while(secretList.length > 0){
        secretList.forEach(async (secret) => {
            
            const value = await sourceMgr.getSecretValue({
                SecretId: secret.Name
            }).promise()
            try{
                await destMgr.putSecretValue({SecretId: value.Name, SecretString: value.SecretString}).promise()
                console.log("Put:", secret.Name)
            }catch(err){
                if(err.name === 'ResourceNotFoundException'){
                    await destMgr.createSecret({
                        Name: value.Name,
                        SecretString: value.SecretString,
                        Tags: secret.Tags,
                    }).promise()
                    console.log("Create:", secret.Name)
                }
                else{
                    console.log("Error:", secret.Name, ` ${err.message}`)
                }
            }
        })
        secretList = []

        if(secrets.NextToken){
            secrets = await sourceMgr.listSecrets({NextToken: secrets.NextToken}).promise()
            secretList = secrets.SecretList
        }
    }
  })()