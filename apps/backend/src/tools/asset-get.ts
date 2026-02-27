import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { assets } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "asset_get",
  description: "Get an asset by ID",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.INTEGER,
        description: "Asset ID",
      },
    },
    required: ["id"],
  },
};

type Args = { id: number };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const row = await db
    .select()
    .from(assets)
    .where(eq(assets.id, args.id))
    .get();
  if (!row) return { error: "Asset not found" };

  const isText = row.mimeType.startsWith("text/") || row.mimeType === "application/json";
  if (isText) {
    return row;
  }
  // Return in { base64, mimeType } format so approve() sends it as inlineData to Gemini
  return {
    id: row.id,
    name: row.name,
    base64: row.content,
    mimeType: row.mimeType,
  };
}
