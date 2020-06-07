import path from 'path'
import fs from 'fs'

const sqlFilePaths: string[] = fs
  .readdirSync(path.resolve(__dirname, './'))
  .filter((filePath) => path.extname(filePath).toLowerCase() === '.sql')
  .map((filePath) => path.resolve(__dirname, filePath))

export { sqlFilePaths }
