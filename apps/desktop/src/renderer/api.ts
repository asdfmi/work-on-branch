import type {
  ChatAttachment,
  ChatResult,
  ToolResult,
  RepoSummary,
  RepoDetail,
  AssetSummary,
  LabelSummary,
  SessionSummary,
  SessionMessage,
} from "@repo/domain";

const BASE_URL = "http://localhost:3000";

export async function sendMessage(
  message: string,
  sessionId: number,
  attachments?: ChatAttachment[],
): Promise<ChatResult> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, attachments, sessionId }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

export async function sendApproval(
  approved: boolean,
  sessionId: number,
  toolResults?: ToolResult[],
): Promise<ChatResult> {
  const res = await fetch(`${BASE_URL}/chat/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved, toolResults, sessionId }),
  });
  if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
  return res.json();
}

export async function createSession(
  repoId?: number | null,
  title?: string,
): Promise<SessionSummary> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoId, title }),
  });
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
  return res.json();
}

export async function fetchSessions(
  repoId?: number | null,
): Promise<SessionSummary[]> {
  const params = new URLSearchParams();
  if (repoId !== undefined) {
    params.set("repoId", repoId != null ? String(repoId) : "");
  }
  const res = await fetch(`${BASE_URL}/sessions?${params}`);
  if (!res.ok) throw new Error(`Fetch sessions failed: ${res.status}`);
  return res.json();
}

export async function updateSession(id: number, title: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Update session failed: ${res.status}`);
}

export async function deleteSession(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete session failed: ${res.status}`);
}

export async function fetchSessionMessages(
  sessionId: number,
): Promise<SessionMessage[]> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error(`Fetch messages failed: ${res.status}`);
  return res.json();
}

export async function createRepo(name: string): Promise<RepoSummary> {
  const res = await fetch(`${BASE_URL}/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Create repo failed: ${res.status}`);
  return res.json();
}

export async function updateRepo(id: number, name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/repos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Update repo failed: ${res.status}`);
}

export async function fetchRepos(): Promise<RepoSummary[]> {
  const res = await fetch(`${BASE_URL}/repos`);
  return res.json();
}

export async function fetchRepo(id: number): Promise<RepoDetail> {
  const res = await fetch(`${BASE_URL}/repos/${id}`);
  return res.json();
}

// --- Events ---

export async function createEvent(
  repoId: number,
  direction: "in" | "out",
  summary: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoId, direction, summary }),
  });
  if (!res.ok) throw new Error(`Create event failed: ${res.status}`);
}

export async function updateEvent(
  id: number,
  summary: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });
  if (!res.ok) throw new Error(`Update event failed: ${res.status}`);
}

export async function deleteEvent(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete event failed: ${res.status}`);
}

// --- Global Assets ---

export async function fetchGlobalAssets(): Promise<AssetSummary[]> {
  const res = await fetch(`${BASE_URL}/assets?global=true`);
  if (!res.ok) throw new Error(`Fetch global assets failed: ${res.status}`);
  return res.json();
}

export async function fetchAsset(
  id: number,
): Promise<{ id: number; name: string; mimeType: string; content: string }> {
  const res = await fetch(`${BASE_URL}/assets/${id}`);
  if (!res.ok) throw new Error(`Fetch asset failed: ${res.status}`);
  return res.json();
}

export async function createGlobalAsset(
  name: string,
  mimeType: string,
  content: string,
  kind: string = "reference",
  repoId?: number,
): Promise<AssetSummary> {
  const res = await fetch(`${BASE_URL}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, name, mimeType, content, repoId }),
  });
  if (!res.ok) throw new Error(`Create global asset failed: ${res.status}`);
  return res.json();
}

export async function fetchRepoAssets(repoId: number): Promise<AssetSummary[]> {
  const res = await fetch(`${BASE_URL}/assets?repoId=${repoId}`);
  if (!res.ok) throw new Error(`Fetch repo assets failed: ${res.status}`);
  return res.json();
}

export async function updateAsset(id: number, name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/assets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Update asset failed: ${res.status}`);
}

export async function deleteGlobalAsset(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/assets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete global asset failed: ${res.status}`);
}

// --- Labels ---

export async function fetchLabels(): Promise<LabelSummary[]> {
  const res = await fetch(`${BASE_URL}/labels`);
  if (!res.ok) throw new Error(`Fetch labels failed: ${res.status}`);
  return res.json();
}

export async function createLabel(name: string): Promise<LabelSummary> {
  const res = await fetch(`${BASE_URL}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Create label failed: ${res.status}`);
  return res.json();
}

export async function deleteLabel(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/labels/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete label failed: ${res.status}`);
}

// --- EventLabels ---

export async function addLabelToEvent(eventId: number, labelId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${eventId}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labelId }),
  });
  if (!res.ok) throw new Error(`Add label to event failed: ${res.status}`);
}

export async function removeLabelFromEvent(eventId: number, labelId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${eventId}/labels/${labelId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Remove label from event failed: ${res.status}`);
}

// --- EventAssets ---

export async function addAssetToEvent(eventId: number, assetId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${eventId}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
  if (!res.ok) throw new Error(`Add asset to event failed: ${res.status}`);
}

export async function removeAssetFromEvent(eventId: number, assetId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/events/${eventId}/assets/${assetId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Remove asset from event failed: ${res.status}`);
}

// --- EventLinks ---

export async function linkEvents(outEventId: number, inEventId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/event-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outEventId, inEventId }),
  });
  if (!res.ok) throw new Error(`Link events failed: ${res.status}`);
}

export async function unlinkEvents(outEventId: number, inEventId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/event-links`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outEventId, inEventId }),
  });
  if (!res.ok) throw new Error(`Unlink events failed: ${res.status}`);
}

