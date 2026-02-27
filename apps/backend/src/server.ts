import Fastify from "fastify";
import cors from "@fastify/cors";
import type {
  ChatRequest,
  ChatResult,
  ApproveRequest,
  RepoDetail,
  CreateSessionRequest,
  SessionSummary,
} from "@repo/domain";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { assets, eventAssets } from "./db/schema.js";
import { chat, approve } from "./chat";
import {
  insertSession,
  findAllSessions,
  findSessionsByRepoId,
  findParsedMessagesBySessionId,
  findAllRepos,
  insertRepo,
  findRepoById,
  findEventsByRepoId,
  findAssetsByEventId,
  findLabelsByEventId,
  findLinksByEventId,
  findGlobalAssets,
  findAssetsByRepoId,
  findAssetById,
  deleteSession,
  updateSessionTitle,
  updateRepoName,
  updateAssetName,
  updateEventSummary,
  deleteEvent,
  insertEvent,
  insertLabel,
  findAllLabels,
  deleteLabel,
  linkLabelToEvent,
  unlinkLabelFromEvent,
  linkAssetToEvent,
  unlinkAssetFromEvent,
  linkEvents,
  unlinkEvents,
} from "./repository.js";

const fastify = Fastify({ logger: true });

fastify.register(cors);

fastify.get("/", async () => {
  return { status: "ok" };
});

// --- Sessions ---

fastify.post<{ Body: CreateSessionRequest }>("/sessions", async (request) => {
  const { repoId, title } = request.body;
  const rid = repoId ?? null;
  const t = title || (rid ? "New Chat" : "General Chat");
  const id = insertSession(rid, t);
  return { id, repoId: rid, title: t, createdAt: new Date().toISOString() };
});

fastify.get<{ Querystring: { repoId?: string } }>(
  "/sessions",
  async (request) => {
    const { repoId } = request.query;
    if (repoId === undefined) return findAllSessions();
    return findSessionsByRepoId(repoId === "" ? null : Number(repoId));
  },
);

fastify.get<{ Params: { id: string } }>(
  "/sessions/:id/messages",
  async (request) => {
    return findParsedMessagesBySessionId(Number(request.params.id));
  },
);

fastify.delete<{ Params: { id: string } }>("/sessions/:id", async (request) => {
  const id = Number(request.params.id);
  deleteSession(id);
  return { deleted: id };
});

fastify.patch<{ Params: { id: string }; Body: { title: string } }>(
  "/sessions/:id",
  async (request) => {
    const id = Number(request.params.id);
    const { title } = request.body;
    updateSessionTitle(id, title);
    return { id, title };
  },
);

// --- Repos ---

fastify.get("/repos", async () => {
  return findAllRepos();
});

fastify.post<{ Body: { name: string } }>("/repos", async (request) => {
  const { name } = request.body;
  const id = insertRepo(name);
  return { id, name, createdAt: new Date().toISOString() };
});

fastify.patch<{ Params: { id: string }; Body: { name: string } }>(
  "/repos/:id",
  async (request) => {
    const id = Number(request.params.id);
    const { name } = request.body;
    updateRepoName(id, name);
    return { id, name };
  },
);

fastify.get<{ Params: { id: string } }>(
  "/repos/:id",
  async (request, reply): Promise<RepoDetail> => {
    const numId = Number(request.params.id);
    const repo = findRepoById(numId);
    if (!repo) {
      reply.code(404);
      throw new Error("Repo not found");
    }

    const eventRows = findEventsByRepoId(numId);
    const events = eventRows.map((ev) => ({
      id: ev.id,
      repoId: ev.repoId,
      direction: ev.direction,
      summary: ev.summary,
      createdAt: ev.createdAt,
      assets: findAssetsByEventId(ev.id),
      labels: findLabelsByEventId(ev.id),
      links: findLinksByEventId(ev.id),
    }));

    return { id: repo.id, name: repo.name, createdAt: repo.createdAt, events };
  },
);

// --- Events ---

fastify.post<{
  Body: { repoId: number; direction: "in" | "out"; summary: string };
}>("/events", async (request) => {
  const { repoId, direction, summary } = request.body;
  const id = insertEvent(repoId, direction, summary);
  return { id, repoId, direction, summary, createdAt: new Date().toISOString() };
});

fastify.patch<{ Params: { id: string }; Body: { summary: string } }>(
  "/events/:id",
  async (request) => {
    const id = Number(request.params.id);
    const { summary } = request.body;
    updateEventSummary(id, summary);
    return { id, summary };
  },
);

fastify.delete<{ Params: { id: string } }>("/events/:id", async (request) => {
  const id = Number(request.params.id);
  deleteEvent(id);
  return { deleted: id };
});

// --- Global Assets ---

fastify.get<{ Querystring: { global?: string; repoId?: string } }>(
  "/assets",
  async (request) => {
    const { repoId } = request.query;
    if (repoId !== undefined) {
      return findAssetsByRepoId(Number(repoId));
    }
    return findGlobalAssets();
  },
);

fastify.get<{ Params: { id: string } }>(
  "/assets/:id",
  async (request, reply) => {
    const asset = findAssetById(Number(request.params.id));
    if (!asset) {
      reply.code(404);
      throw new Error("Asset not found");
    }
    return asset;
  },
);

fastify.patch<{ Params: { id: string }; Body: { name: string } }>(
  "/assets/:id",
  async (request) => {
    const id = Number(request.params.id);
    const { name } = request.body;
    updateAssetName(id, name);
    return { id, name };
  },
);

fastify.post<{
  Body: { kind: string; name: string; mimeType: string; content: string; repoId?: number };
}>("/assets", async (request) => {
  const { kind, name, mimeType, content, repoId } = request.body;
  const ts = new Date().toISOString();
  const result = db
    .insert(assets)
    .values({
      repoId: repoId ?? null,
      kind: kind as "reference" | "work",
      name,
      mimeType,
      content,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return { id: Number(result.lastInsertRowid), name, mimeType, createdAt: ts };
});

fastify.delete<{ Params: { id: string } }>(
  "/assets/:id",
  async (request, reply) => {
    const id = Number(request.params.id);
    const asset = findAssetById(id);
    if (!asset) {
      reply.code(404);
      throw new Error("Asset not found");
    }
    db.delete(eventAssets).where(eq(eventAssets.assetId, id)).run();
    db.delete(assets).where(eq(assets.id, id)).run();
    return { deleted: id };
  },
);

// --- Labels ---

fastify.get("/labels", async () => {
  return findAllLabels();
});

fastify.post<{ Body: { name: string } }>("/labels", async (request) => {
  const { name } = request.body;
  const id = insertLabel(name);
  return { id, name };
});

fastify.delete<{ Params: { id: string } }>("/labels/:id", async (request) => {
  const id = Number(request.params.id);
  deleteLabel(id);
  return { deleted: id };
});

// --- EventLabels ---

fastify.post<{ Params: { eventId: string }; Body: { labelId: number } }>(
  "/events/:eventId/labels",
  async (request) => {
    const eventId = Number(request.params.eventId);
    const { labelId } = request.body;
    linkLabelToEvent(eventId, labelId);
    return { eventId, labelId };
  },
);

fastify.delete<{ Params: { eventId: string; labelId: string } }>(
  "/events/:eventId/labels/:labelId",
  async (request) => {
    const eventId = Number(request.params.eventId);
    const labelId = Number(request.params.labelId);
    unlinkLabelFromEvent(eventId, labelId);
    return { eventId, labelId };
  },
);

// --- EventAssets ---

fastify.post<{ Params: { eventId: string }; Body: { assetId: number } }>(
  "/events/:eventId/assets",
  async (request) => {
    const eventId = Number(request.params.eventId);
    const { assetId } = request.body;
    linkAssetToEvent(eventId, assetId);
    return { eventId, assetId };
  },
);

fastify.delete<{ Params: { eventId: string; assetId: string } }>(
  "/events/:eventId/assets/:assetId",
  async (request) => {
    const eventId = Number(request.params.eventId);
    const assetId = Number(request.params.assetId);
    unlinkAssetFromEvent(eventId, assetId);
    return { eventId, assetId };
  },
);

// --- EventLinks ---

fastify.post<{ Body: { outEventId: number; inEventId: number } }>(
  "/event-links",
  async (request) => {
    const { outEventId, inEventId } = request.body;
    linkEvents(outEventId, inEventId);
    return { outEventId, inEventId };
  },
);

fastify.delete<{ Body: { outEventId: number; inEventId: number } }>(
  "/event-links",
  async (request) => {
    const { outEventId, inEventId } = request.body;
    unlinkEvents(outEventId, inEventId);
    return { outEventId, inEventId };
  },
);

// --- Chat ---

fastify.post<{ Body: ChatRequest }>(
  "/chat",
  async (request): Promise<ChatResult> => {
    const { message, attachments, sessionId } = request.body;
    return chat(message, sessionId, attachments);
  },
);

fastify.post<{ Body: ApproveRequest }>(
  "/chat/approve",
  async (request): Promise<ChatResult> => {
    const { approved, toolResults, sessionId } = request.body;
    return approve(approved, sessionId, toolResults);
  },
);


fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
