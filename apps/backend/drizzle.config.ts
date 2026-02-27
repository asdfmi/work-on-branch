import path from "path";
import { defineConfig } from "drizzle-kit";

const backendDir = __dirname;

export default defineConfig({
  schema: path.resolve(backendDir, "src/db/schema.ts"),
  out: path.resolve(backendDir, "drizzle"),
  dialect: "sqlite",
  dbCredentials: {
    url: path.resolve(backendDir, "data.db"),
  },
});
