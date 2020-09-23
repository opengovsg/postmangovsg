// Imports the Google Cloud client library
import { Storage, File } from '@google-cloud/storage'
import path from 'path'
import config from './config'
import { decrypt } from './decrypt-dump'

// Creates a client
const storage = new Storage();

const bucket = config.get('gcloudBackupBucket')

async function listFiles(): Promise<Array<File>> {
  console.log('list files')
  // Lists files in the bucket
  const [files] = await storage.bucket(bucket).getFiles();

  console.log('Files:');
  files.forEach(file => {
    console.log(file.name);
  });
  return files
}

async function downloadFile(srcFilename: string): Promise<void> {
  const options = {
    // The path to which the file should be downloaded
    // remove date prefix
    destination: srcFilename.split('/')[1],
  };

  console.log('download file', srcFilename)
  // Downloads the file
  await storage.bucket(bucket).file(srcFilename).download(options);

  console.log(
    `gs://${bucket}/${srcFilename} downloaded.`
  );
}

async function getLatestBackup(files: Array<File>) {
  // get last files in list which is in lexicographic order
  files.reverse()
  const [dumpFile] = files
  if (path.extname(dumpFile.name) !== '.dump') {
    throw new Error('Invalid file type!')
  }
  await downloadFile(dumpFile.name)
}

async function run(): Promise<void> {
  try {
    const files = await listFiles()
    await getLatestBackup(files)
    await decrypt()
  } catch (error) {
    console.log(error)
  }
}

run()