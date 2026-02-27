import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const repos = sqliteTable("repos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id").references(() => repos.id),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  role: text("role").notNull(),
  parts: text("parts").notNull(),
  createdAt: text("created_at").notNull(),
});

export const eventDirections = ["in", "out"] as const;
export type EventDirection = (typeof eventDirections)[number];

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id")
    .notNull()
    .references(() => repos.id),
  direction: text("direction", { enum: eventDirections }).notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
});

export const eventLinks = sqliteTable("event_links", {
  outEventId: integer("out_event_id")
    .notNull()
    .references(() => events.id),
  inEventId: integer("in_event_id")
    .notNull()
    .references(() => events.id),
});

export const labels = sqliteTable("labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const eventLabels = sqliteTable("event_labels", {
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  labelId: integer("label_id")
    .notNull()
    .references(() => labels.id),
});

export const eventAssets = sqliteTable("event_assets", {
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
});

export const assetKinds = ["reference", "work"] as const;
export type AssetKind = (typeof assetKinds)[number];

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id").references(() => repos.id),
  kind: text("kind", { enum: assetKinds }).notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
