import "dotenv/config"; // needed to load .env file
import { z } from "zod";

export const IS_LOCAL = process.env.IS_LOCAL === "true";
export const LOCAL_DB_URI = process.env.LOCAL_DB_URI;

const envVars = z.object({
  IS_LOCAL: z.string(),
  LOCAL_DB_URI: z.string(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVars> {}
  }
}
