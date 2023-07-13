import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Config } from "sst/node/config";

const client = postgres(
  process.env.IS_LOCAL
    ? "postgres://postgres:postgres@localhost:5432/postmangovsg_dev" // pragma: allowlist secret
    : Config.POSTMAN_DB_URI
);
export const db = drizzle(client);
