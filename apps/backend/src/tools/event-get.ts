import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  events,
  eventLabels,
  labels,
  eventAssets,
  assets,
  eventLinks,
} from "../db/schema.js";

export const declaration: FunctionDeclaration = {
  name: "event_get",
  description:
    "Get an event by ID, including its labels, assets, and linked events",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.INTEGER,
        description: "Event ID",
      },
    },
    required: ["id"],
  },
};

type Args = { id: number };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;

  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, args.id))
    .get();
  if (!event) return { error: "Event not found" };

  const eventLabelRows = await db
    .select({ id: labels.id, name: labels.name })
    .from(eventLabels)
    .innerJoin(labels, eq(eventLabels.labelId, labels.id))
    .where(eq(eventLabels.eventId, args.id));

  const eventAssetRows = await db
    .select({
      id: assets.id,
      name: assets.name,
      mimeType: assets.mimeType,
    })
    .from(eventAssets)
    .innerJoin(assets, eq(eventAssets.assetId, assets.id))
    .where(eq(eventAssets.eventId, args.id));

  const outLinks = await db
    .select({ inEventId: eventLinks.inEventId })
    .from(eventLinks)
    .where(eq(eventLinks.outEventId, args.id));

  const inLinks = await db
    .select({ outEventId: eventLinks.outEventId })
    .from(eventLinks)
    .where(eq(eventLinks.inEventId, args.id));

  return {
    ...event,
    labels: eventLabelRows,
    assets: eventAssetRows,
    outLinks: outLinks.map((l) => l.inEventId),
    inLinks: inLinks.map((l) => l.outEventId),
  };
}
