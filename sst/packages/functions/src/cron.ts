import { Config } from "sst/node/config";

import PostmanDbClient from "@postmangovsg-sst/core/src/database/client";
import { apiKeys } from "@postmangovsg-sst/core/src/models";
import { IS_LOCAL, LOCAL_DB_URI } from "./env";

export async function handler() {
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI;
  const db = new PostmanDbClient(dbUri).getClient();
  const apiKey = await db.select().from(apiKeys).limit(1);
  console.log(apiKey);
}
