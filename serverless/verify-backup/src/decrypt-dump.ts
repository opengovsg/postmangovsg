import { KeyManagementServiceClient } from '@google-cloud/kms'
import fs from 'fs'
import config from './config'

const client = new KeyManagementServiceClient()


const INPUT_FILE = process.env.INPUT_FILE || 'postman.dump'
// const OUTPUT_FILE = process.env.OUTPUT_FILE || 'postman.decrypted.dump'

async function decryptAsymmetric(ciphertext: string) {
  if (!ciphertext) {
    throw new Error('Empty ciphertext provided!')
  }

  console.log('Decrypting dump file...')
  const [result] = await client.asymmetricDecrypt({
    name: config.get('gcloudPrivateKeyResourceId'),
    ciphertext: Buffer.from(ciphertext),
  });

  // NOTE: The ciphertext must be properly formatted. In Node < 12, the
  // crypto.publicEncrypt() function does not properly consume the OAEP
  // padding and thus produces invalid ciphertext. If you are using Node to do
  // public key encryption, please use version 12+.
  const plaintext = result.plaintext?.toString();

  console.log(`Plaintext: ${plaintext}`);
  return plaintext;
}

export async function decrypt() {
  const encryptedDump = fs.readFileSync(INPUT_FILE, 'utf8')

  await decryptAsymmetric(encryptedDump)

}

decrypt()