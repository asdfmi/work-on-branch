import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, eventLinks, eventLabels, eventAssets } from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "event_list",
  description: "List events in a repository with their labels, assets, and links",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      repoId: {
        type: SchemaType.INTEGER,
        description: "Repository ID",
      },
    },
    required: ["repoId"],
  },
};

type Args = { repoId: number };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.repoId, args.repoId));

  const enriched = rows.map((ev) => {
    const outLinks = db
      .select({ inEventId: eventLinks.inEventId })
      .from(eventLinks)
      .where(eq(eventLinks.outEventId, ev.id))
      .all();
    const inLinks = db
      .select({ outEventId: eventLinks.outEventId })
      .from(eventLinks)
      .where(eq(eventLinks.inEventId, ev.id))
      .all();
    const labelIds = db
      .select({ labelId: eventLabels.labelId })
      .from(eventLabels)
      .where(eq(eventLabels.eventId, ev.id))
      .all();
    const assetIds = db
      .select({ assetId: eventAssets.assetId })
      .from(eventAssets)
      .where(eq(eventAssets.eventId, ev.id))
      .all();

    return {
      ...ev,
      outLinks: outLinks.map((l) => l.inEventId),
      inLinks: inLinks.map((l) => l.outEventId),
      labelIds: labelIds.map((l) => l.labelId),
      assetIds: assetIds.map((a) => a.assetId),
    };
  });

  return { events: enriched };
}
