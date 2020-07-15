import Papa from 'papaparse'
declare module 'papaparse' {
  //@see https://github.com/mholt/PapaParse/issues/674
  export interface ParseConfig extends Papa.ParseConfig {
    chunkSize?: number
  }
}
