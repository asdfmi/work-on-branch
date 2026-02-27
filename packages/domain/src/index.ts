export type MessageResponse = {
  message: string;
};

export type ChatAttachment = {
  name: string;
  mimeType: string;
  base64: string;
};

export type ChatRequest = {
  message: string;
  attachments?: ChatAttachment[];
  sessionId: number;
};

export type ToolCall = { name: string; args: Record<string, unknown> };

export type ToolExecutionResult = {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
};

export type ChatResult =
  | {
      type: "tool_calls";
      calls: ToolCall[];
      reply?: string;
      toolResults?: ToolExecutionResult[];
    }
  | { type: "reply"; reply: string; toolResults?: ToolExecutionResult[] };

export type ToolResult = { name: string; result: object };

export type ApproveRequest = {
  approved: boolean;
  toolResults?: ToolResult[];
  sessionId: number;
};

export type SessionSummary = {
  id: number;
  repoId: number | null;
  title: string;
  createdAt: string;
};

export type CreateSessionRequest = {
  repoId?: number | null;
  title?: string;
};

export type SessionMessage = {
  id: number;
  role: string;
  parts: unknown[];
  createdAt: string;
};

export type RepoSummary = { id: number; name: string; createdAt: string };
export type AssetSummary = { id: number; name: string; mimeType: string };
export type LabelSummary = { id: number; name: string };
export type EventLinks = { outLinks: number[]; inLinks: number[] };
export type EventDetail = {
  id: number;
  repoId: number;
  direction: "in" | "out";
  summary: string;
  createdAt: string;
  assets: AssetSummary[];
  labels: LabelSummary[];
  links: EventLinks;
};
export type RepoDetail = {
  id: number;
  name: string;
  createdAt: string;
  events: EventDetail[];
};
