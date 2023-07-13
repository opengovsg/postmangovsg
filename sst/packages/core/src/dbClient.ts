import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Config } from "sst/node/config";

const client = postgres(Config.POSTMAN_DB_URI);
export const db = drizzle(client);
