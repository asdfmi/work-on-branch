import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { repos } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "repo_get",
  description: "Get a repository by ID",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.INTEGER,
        description: "Repository ID",
      },
    },
    required: ["id"],
  },
};

type Args = { id: number };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const row = await db.select().from(repos).where(eq(repos.id, args.id)).get();
  if (!row) return { error: "Repo not found" };
  return row;
}
