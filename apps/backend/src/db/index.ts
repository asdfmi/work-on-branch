import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = path.resolve(__dirname, "..", "..", "data.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
