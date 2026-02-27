import type { FunctionDeclaration } from "@google/generative-ai";
import { db } from "../db/index.js";
import { repos } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "repo_list",
  description: "List all repositories",
};

export async function execute(_args: Record<string, unknown>): Promise<object> {
  const rows = await db.select().from(repos);
  return { repos: rows };
}
