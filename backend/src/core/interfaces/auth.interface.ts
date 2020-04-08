export interface HashedOtp {
  hash: string;
  retries: number;
  createdAt: number; // Date.getTime() milliseconds
}