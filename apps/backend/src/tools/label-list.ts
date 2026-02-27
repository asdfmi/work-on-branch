import type { FunctionDeclaration } from "@google/generative-ai";
import { db } from "../db/index.js";
import { labels } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "label_list",
  description: "List all labels",
};

export async function execute(_args: Record<string, unknown>): Promise<object> {
  const rows = await db.select().from(labels);
  return { labels: rows };
}
