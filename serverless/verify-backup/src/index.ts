import { Storage, File } from '@google-cloud/storage'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import config from './config'
import { decrypt } from './decrypt-dump'

const bucket = config.get('gcloudBackupBucket')
let storage: Storage

async function listFiles(): Promise<Array<File>> {
  console.log('Listing files...')
  // Lists files in the bucket
  const [files] = await storage.bucket(bucket).getFiles();

  console.log('Files:');
  files.forEach((file: File) => {
    console.log(file.name);
  });
  return files
}
async function init() {
  // Creates a client
  const secretClient = new SecretManagerServiceClient()
  const secretResourceId = config.get('gcloudBackupKeyResourceId')
  const [secret] = await secretClient.accessSecretVersion({ name: secretResourceId })
  if(!secret.payload?.data) {
    throw new Error('Postman backup service account key secret not found!')
  }
  const serviceAccountKey = JSON.parse(secret.payload?.data?.toString())
  storage = new Storage({credentials: {
    client_email:serviceAccountKey.client_email,
    private_key: serviceAccountKey.private_key
  }});
}

async function downloadFile(srcFilename: string): Promise<void> {
  const options = {
    // The path to which the file should be downloaded
    // remove date prefix
    destination: srcFilename.split('/')[1],
  };

  console.log('Downloading file', srcFilename)
  // Downloads the file
  await storage.bucket(bucket).file(srcFilename).download(options);

  console.log(
    `gs://${bucket}/${srcFilename} downloaded.`
  );
}

async function getLatestBackup(files: Array<File>) {
  // get last three files in list which is in lexicographic order
  // db dump, secrets dump and params json
  await Promise.all(files.slice(-3).map((file) => downloadFile(file.name)))
}

async function run(): Promise<void> {
  try {
    await init()
    const files = await listFiles()
    await getLatestBackup(files)
    await decrypt()
  } catch (error) {
    console.log(error)
  }
}

run()