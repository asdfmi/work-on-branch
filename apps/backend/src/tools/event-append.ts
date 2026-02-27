import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, labels, eventLabels, eventAssets } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "event_append",
  description:
    "Append a new event to a repository. Optionally attach labels by name and assets by ID.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      repoId: {
        type: SchemaType.INTEGER,
        description: "Repository ID",
      },
      direction: {
        type: SchemaType.STRING,
        description: "Event direction: 'in' or 'out'",
      },
      summary: {
        type: SchemaType.STRING,
        description: "Summary text of the event",
      },
      labelNames: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "Optional label names to attach (will be created if they don't exist)",
      },
      assetIds: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.INTEGER },
        description: "Optional asset IDs to attach",
      },
    },
    required: ["repoId", "direction", "summary"],
  },
};

type Args = {
  repoId: number;
  direction: "in" | "out";
  summary: string;
  labelNames?: string[];
  assetIds?: number[];
};

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const ts = new Date().toISOString();

  const labelNames = args.labelNames ?? [];
  const assetIds = args.assetIds ?? [];

  let eventId: number;

  db.transaction((tx) => {
    const result = tx
      .insert(events)
      .values({
        repoId: args.repoId,
        direction: args.direction,
        summary: args.summary,
        createdAt: ts,
      })
      .run();
    eventId = Number(result.lastInsertRowid);

    for (const name of labelNames) {
      let label = tx.select().from(labels).where(eq(labels.name, name)).get();
      if (!label) {
        const lr = tx.insert(labels).values({ name }).run();
        label = { id: Number(lr.lastInsertRowid), name };
      }
      tx.insert(eventLabels)
        .values({ eventId: eventId!, labelId: label.id })
        .run();
    }

    for (const assetId of assetIds) {
      tx.insert(eventAssets).values({ eventId: eventId!, assetId }).run();
    }
  });

  return {
    id: eventId!,
    repoId: args.repoId,
    direction: args.direction,
    summary: args.summary,
    createdAt: ts,
  };
}
