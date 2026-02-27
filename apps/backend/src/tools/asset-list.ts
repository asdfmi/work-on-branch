import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { assets } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "asset_list",
  description:
    "List assets, optionally filtered by repository ID. Use global=true to list global assets (not tied to any repository).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      repoId: {
        type: SchemaType.INTEGER,
        description: "Optional repository ID to filter by",
      },
      global: {
        type: SchemaType.BOOLEAN,
        description: "If true, list only global assets (repoId is null)",
      },
    },
  },
};

type Args = { repoId?: number; global?: boolean };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const query = db.select().from(assets);
  let rows;
  if (args.global) {
    rows = await query.where(isNull(assets.repoId));
  } else if (args.repoId) {
    rows = await query.where(eq(assets.repoId, args.repoId));
  } else {
    rows = await query;
  }
  return { assets: rows };
}
