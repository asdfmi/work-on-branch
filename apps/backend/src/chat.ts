import {
  GoogleGenerativeAI,
  type FunctionCall,
  type Part,
  type Content,
} from "@google/generative-ai";
import type {
  ChatAttachment,
  ChatResult,
  ToolResult,
  ToolExecutionResult,
} from "@repo/domain";
import { getToolDeclarations, executeTool } from "./tools/index.js";
import {
  getSessionRepoId,
  insertMessage,
  findMessagesBySessionId,
} from "./repository.js";
import { isConvertible, convertToPdf } from "./convert.js";

// --- Gemini session ---

const MODEL_ID = "gemini-2.5-pro";

const SYSTEM_INSTRUCTION = process.env.SYSTEM_INSTRUCTION;
if (!SYSTEM_INSTRUCTION)
  throw new Error("SYSTEM_INSTRUCTION env var is required");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
type GeminiChat = ReturnType<
  ReturnType<typeof genAI.getGenerativeModel>["startChat"]
>;

const geminiSessions = new Map<number, GeminiChat>();
const pendingCalls = new Map<number, FunctionCall[]>();

/**
 * Build a clean history from DB that passes Gemini SDK validation.
 * Strips functionResponse/functionCall parts and merges consecutive same-role messages.
 */
function buildCleanHistory(sessionId: number): Content[] {
  const rawMessages = findMessagesBySessionId(sessionId);
  const result: Content[] = [];

  for (const r of rawMessages) {
    const parts = JSON.parse(r.parts) as Part[];

    // Skip messages containing functionResponse (tool results)
    if (parts.some((p) => "functionResponse" in p)) continue;

    // For messages with functionCall, keep only text/inlineData parts
    const hasFnCall = parts.some((p) => "functionCall" in p);
    let keepParts = parts;
    if (hasFnCall) {
      keepParts = parts.filter((p) => "text" in p || "inlineData" in p);
      if (keepParts.length === 0) continue;
    }

    const role = r.role as "user" | "model";

    // Merge consecutive same-role messages
    if (result.length > 0 && result[result.length - 1].role === role) {
      result[result.length - 1].parts.push(...keepParts);
    } else {
      result.push({ role, parts: keepParts });
    }
  }

  return result;
}

function getGeminiSession(sessionId: number): GeminiChat {
  let session = geminiSessions.get(sessionId);
  if (!session) {
    const repoId = getSessionRepoId(sessionId);
    const systemInstruction = repoId
      ? `${SYSTEM_INSTRUCTION}\n\nCurrent repository: ${repoId}`
      : undefined;
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      ...(systemInstruction && { systemInstruction }),
      tools: [{ functionDeclarations: getToolDeclarations() }],
    });
    const history = buildCleanHistory(sessionId);
    session = model.startChat({ history });
    geminiSessions.set(sessionId, session);
  }
  return session;
}

/** Persist parts to DB, send to Gemini, persist response, return function calls if any. */
async function sendToGemini(sessionId: number, role: string, parts: Part[]) {
  insertMessage(sessionId, role, JSON.stringify(parts));
  const result = await getGeminiSession(sessionId).sendMessage(parts);
  const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
  insertMessage(sessionId, "model", JSON.stringify(responseParts));
  return {
    functionCalls: result.response.functionCalls(),
    text: () => result.response.text(),
  };
}

function toResult(
  sessionId: number,
  res: { functionCalls: FunctionCall[] | undefined; text: () => string },
  toolResults?: ToolExecutionResult[],
): ChatResult {
  if (res.functionCalls) {
    pendingCalls.set(sessionId, res.functionCalls);
    let reply: string | undefined;
    try {
      reply = res.text() || undefined;
    } catch {
      /* no text parts */
    }
    return {
      type: "tool_calls",
      calls: res.functionCalls.map((c) => ({
        name: c.name,
        args: c.args as Record<string, unknown>,
      })),
      ...(reply && { reply }),
      ...(toolResults && toolResults.length > 0 && { toolResults }),
    };
  }
  pendingCalls.delete(sessionId);
  return {
    type: "reply",
    reply: res.text(),
    ...(toolResults && toolResults.length > 0 && { toolResults }),
  };
}

async function autoDenyPending(sessionId: number): Promise<void> {
  let calls = pendingCalls.get(sessionId);
  pendingCalls.delete(sessionId);
  for (let i = 0; i < 3 && calls; i++) {
    const parts: Part[] = calls.map((call) => ({
      functionResponse: {
        name: call.name,
        response: {
          cancelled:
            "User cancelled this operation. Please wait for new instructions.",
        },
      },
    }));
    const res = await sendToGemini(sessionId, "user", parts);
    calls = res.functionCalls ?? undefined;
  }
}

// --- Public API ---

export async function chat(
  message: string,
  sessionId: number,
  attachments?: ChatAttachment[],
): Promise<ChatResult> {
  if (pendingCalls.has(sessionId)) await autoDenyPending(sessionId);

  const parts: Part[] = [{ text: message }];
  if (attachments) {
    for (const a of attachments) {
      let { base64, mimeType } = a;
      if (isConvertible(mimeType)) {
        ({ base64, mimeType } = await convertToPdf(base64, mimeType, a.name));
      }
      parts.push({ inlineData: { data: base64, mimeType } });
    }
  }

  return toResult(sessionId, await sendToGemini(sessionId, "user", parts));
}

function hasInlineData(
  response: object,
): response is { base64: string; mimeType: string } {
  return "base64" in response && "mimeType" in response;
}

export async function approve(
  approved: boolean,
  sessionId: number,
  toolResults?: ToolResult[],
): Promise<ChatResult> {
  const calls = pendingCalls.get(sessionId);
  if (!calls) throw new Error("No pending tool calls");
  pendingCalls.delete(sessionId);

  const repoId = getSessionRepoId(sessionId);
  const frontendResults = new Map(
    (toolResults ?? []).map((r) => [r.name, r.result]),
  );
  const fnParts: Part[] = [];
  const dataParts: Part[] = [];
  const execResults: ToolExecutionResult[] = [];

  for (const call of calls) {
    const args = call.args as Record<string, unknown>;
    let response: object;
    if (!approved) {
      response = { error: "User denied execution" };
    } else if (frontendResults.has(call.name)) {
      response = frontendResults.get(call.name)!;
    } else {
      response = await executeTool(call.name, args, repoId);
    }

    const sanitized = hasInlineData(response)
      ? { success: true, mimeType: response.mimeType }
      : response;
    execResults.push({ name: call.name, args, result: sanitized });

    fnParts.push({
      functionResponse: {
        name: call.name,
        response: sanitized,
      },
    });
    if (approved && hasInlineData(response)) {
      dataParts.push({
        inlineData: { data: response.base64, mimeType: response.mimeType },
      });
    }
  }

  // Gemini forbids mixing FunctionResponse with other part types in one message
  let res = await sendToGemini(sessionId, "user", fnParts);
  if (dataParts.length > 0 && !res.functionCalls) {
    res = await sendToGemini(sessionId, "user", dataParts);
  }

  return toResult(sessionId, res, execResults);
}
