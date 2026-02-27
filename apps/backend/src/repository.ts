import { eq, and, asc, isNull } from "drizzle-orm";
import { db } from "./db/index.js";
import {
  sessions,
  messages,
  repos,
  events,
  assets,
  eventAssets,
  labels,
  eventLabels,
  eventLinks,
} from "./db/schema.js";

// --- Sessions ---

export function insertSession(repoId: number | null, title: string): number {
  const result = db
    .insert(sessions)
    .values({
      repoId,
      title,
      createdAt: new Date().toISOString(),
    })
    .run();
  return Number(result.lastInsertRowid);
}

export function getSessionRepoId(sessionId: number): number | undefined {
  const row = db
    .select({ repoId: sessions.repoId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  return row?.repoId ?? undefined;
}

export function findAllSessions() {
  return db.select().from(sessions).orderBy(asc(sessions.createdAt)).all();
}

export function findSessionsByRepoId(repoId: number | null) {
  if (repoId === null) {
    return db
      .select()
      .from(sessions)
      .where(isNull(sessions.repoId))
      .orderBy(asc(sessions.createdAt))
      .all();
  }
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.repoId, repoId))
    .orderBy(asc(sessions.createdAt))
    .all();
}

export function deleteSession(id: number): void {
  db.delete(messages).where(eq(messages.sessionId, id)).run();
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

// --- Messages ---

export function insertMessage(
  sessionId: number,
  role: string,
  parts: string,
): void {
  db.insert(messages)
    .values({
      sessionId,
      role,
      parts,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function findMessagesBySessionId(sessionId: number) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.id))
    .all();
}

export function findParsedMessagesBySessionId(sessionId: number) {
  return findMessagesBySessionId(sessionId).map((r) => ({
    id: r.id,
    role: r.role,
    parts: JSON.parse(r.parts),
    createdAt: r.createdAt,
  }));
}

// --- Repos ---

export function findAllRepos() {
  return db.select().from(repos).all();
}

export function insertRepo(name: string): number {
  const result = db
    .insert(repos)
    .values({ name, createdAt: new Date().toISOString() })
    .run();
  return Number(result.lastInsertRowid);
}

export function findRepoById(id: number) {
  return db.select().from(repos).where(eq(repos.id, id)).get();
}

export function insertEvent(
  repoId: number,
  direction: "in" | "out",
  summary: string,
): number {
  const result = db
    .insert(events)
    .values({
      repoId,
      direction,
      summary,
      createdAt: new Date().toISOString(),
    })
    .run();
  return Number(result.lastInsertRowid);
}

export function findEventsByRepoId(repoId: number) {
  return db
    .select()
    .from(events)
    .where(eq(events.repoId, repoId))
    .orderBy(asc(events.createdAt))
    .all();
}

export function findGlobalAssets() {
  return db
    .select({ id: assets.id, name: assets.name, mimeType: assets.mimeType })
    .from(assets)
    .where(isNull(assets.repoId))
    .orderBy(asc(assets.id))
    .all();
}

export function findAssetsByRepoId(repoId: number) {
  return db
    .select({ id: assets.id, name: assets.name, mimeType: assets.mimeType })
    .from(assets)
    .where(eq(assets.repoId, repoId))
    .orderBy(asc(assets.id))
    .all();
}

export function findAssetById(id: number) {
  return db.select().from(assets).where(eq(assets.id, id)).get();
}

// --- Update helpers ---

export function updateSessionTitle(id: number, title: string): void {
  db.update(sessions).set({ title }).where(eq(sessions.id, id)).run();
}

export function updateRepoName(id: number, name: string): void {
  db.update(repos).set({ name }).where(eq(repos.id, id)).run();
}

export function updateAssetName(id: number, name: string): void {
  db.update(assets).set({ name }).where(eq(assets.id, id)).run();
}

export function updateEventSummary(id: number, summary: string): void {
  db.update(events).set({ summary }).where(eq(events.id, id)).run();
}

export function deleteEvent(id: number): void {
  db.delete(eventAssets).where(eq(eventAssets.eventId, id)).run();
  db.delete(eventLabels).where(eq(eventLabels.eventId, id)).run();
  db.delete(eventLinks).where(eq(eventLinks.outEventId, id)).run();
  db.delete(eventLinks).where(eq(eventLinks.inEventId, id)).run();
  db.delete(events).where(eq(events.id, id)).run();
}

export function findAssetsByEventId(eventId: number) {
  return db
    .select({ id: assets.id, name: assets.name, mimeType: assets.mimeType })
    .from(eventAssets)
    .innerJoin(assets, eq(eventAssets.assetId, assets.id))
    .where(eq(eventAssets.eventId, eventId))
    .all();
}

// --- Labels ---

export function insertLabel(name: string): number {
  const result = db.insert(labels).values({ name }).run();
  return Number(result.lastInsertRowid);
}

export function findAllLabels() {
  return db
    .select({ id: labels.id, name: labels.name })
    .from(labels)
    .orderBy(asc(labels.id))
    .all();
}

export function deleteLabel(id: number): void {
  db.delete(eventLabels).where(eq(eventLabels.labelId, id)).run();
  db.delete(labels).where(eq(labels.id, id)).run();
}

// --- EventLabels ---

export function linkLabelToEvent(eventId: number, labelId: number): void {
  db.insert(eventLabels).values({ eventId, labelId }).run();
}

export function unlinkLabelFromEvent(eventId: number, labelId: number): void {
  db.delete(eventLabels)
    .where(and(eq(eventLabels.eventId, eventId), eq(eventLabels.labelId, labelId)))
    .run();
}

export function findLabelsByEventId(eventId: number) {
  return db
    .select({ id: labels.id, name: labels.name })
    .from(eventLabels)
    .innerJoin(labels, eq(eventLabels.labelId, labels.id))
    .where(eq(eventLabels.eventId, eventId))
    .all();
}

// --- EventAssets ---

export function linkAssetToEvent(eventId: number, assetId: number): void {
  db.insert(eventAssets).values({ eventId, assetId }).run();
}

export function unlinkAssetFromEvent(eventId: number, assetId: number): void {
  db.delete(eventAssets)
    .where(and(eq(eventAssets.eventId, eventId), eq(eventAssets.assetId, assetId)))
    .run();
}

// --- EventLinks ---

export function linkEvents(outEventId: number, inEventId: number): void {
  db.insert(eventLinks).values({ outEventId, inEventId }).run();
}

export function unlinkEvents(outEventId: number, inEventId: number): void {
  db.delete(eventLinks)
    .where(and(eq(eventLinks.outEventId, outEventId), eq(eventLinks.inEventId, inEventId)))
    .run();
}

export function findLinksByEventId(eventId: number) {
  const outRows = db
    .select({ inEventId: eventLinks.inEventId })
    .from(eventLinks)
    .where(eq(eventLinks.outEventId, eventId))
    .all();
  const inRows = db
    .select({ outEventId: eventLinks.outEventId })
    .from(eventLinks)
    .where(eq(eventLinks.inEventId, eventId))
    .all();
  return {
    outLinks: outRows.map((r) => r.inEventId),
    inLinks: inRows.map((r) => r.outEventId),
  };
}
