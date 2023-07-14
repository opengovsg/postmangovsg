import { EnvVariables } from "./MyStack";
import { z } from "zod";

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<EnvVariables> {}
  }
}

export default global;
