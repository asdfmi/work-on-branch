import type { ToolCall, ToolResult } from "@repo/domain";
import { createGlobalAsset, addAssetToEvent } from "./api";

export type FrontendToolContext = {
  repoId?: number | null;
};

const FRONTEND_TOOLS = new Set([
  "cat",
  "ls",
  "tree",
  "grep",
  "find",
  "cp",
  "mv",
  "write",
  "convert_to_pdf",
  "asset_create",
  "docx_snapshot",
  "docx_read",
  "docx_replace_paragraph",
  "docx_insert_paragraph",
  "docx_delete_paragraph",
]);

export function isFrontendTool(name: string): boolean {
  return FRONTEND_TOOLS.has(name);
}

async function executeAssetCreate(
  args: Record<string, unknown>,
  ctx: FrontendToolContext,
): Promise<object> {
  const filePath = args.path as string;
  const eventId = args.eventId as number | undefined;
  const assetName = (args.name as string | undefined) ?? filePath.split("/").pop() ?? "asset";

  const catResult = await window.fs.cat(filePath);
  let content: string;
  let mimeType: string;

  if ("base64" in catResult) {
    content = catResult.base64 as string;
    mimeType = catResult.mimeType as string;
  } else {
    content = catResult.content as string;
    mimeType = "text/plain";
  }

  const asset = await createGlobalAsset(
    assetName,
    mimeType,
    content,
    "reference",
    ctx.repoId ?? undefined,
  );

  if (eventId) {
    await addAssetToEvent(eventId, asset.id);
  }

  return {
    id: asset.id,
    name: asset.name,
    mimeType: asset.mimeType,
    linkedToEvent: eventId ?? null,
  };
}

async function executeOne(
  call: ToolCall,
  ctx: FrontendToolContext,
): Promise<object> {
  const a = call.args;
  switch (call.name) {
    case "cat":
      return window.fs.cat(a.path as string);
    case "ls":
      return window.fs.ls(a.path as string);
    case "tree":
      return window.fs.tree(a.path as string, a.depth as number | undefined);
    case "grep":
      return window.fs.grep(
        a.pattern as string,
        a.path as string,
        a.glob as string | undefined,
      );
    case "write":
      return window.fs.write(a.path as string, a.content as string);
    case "find":
      return window.fs.find(a.path as string, a.glob as string);
    case "cp":
      return window.fs.cp(a.src as string, a.dest as string);
    case "mv":
      return window.fs.mv(a.src as string, a.dest as string);
    case "convert_to_pdf":
      return window.fs.convertToPdf(a.path as string);
    case "asset_create":
      return executeAssetCreate(a, ctx);
    case "docx_snapshot":
      return window.docx.snapshot(a.sourcePath as string, a.destPath as string);
    case "docx_read":
      return window.docx.read(a.filePath as string);
    case "docx_replace_paragraph":
      return window.docx.replaceParagraph(
        a.filePath as string,
        a.index as number,
        a.newText as string,
      );
    case "docx_insert_paragraph":
      return window.docx.insertParagraph(
        a.filePath as string,
        a.afterIndex as number,
        a.text as string,
      );
    case "docx_delete_paragraph":
      return window.docx.deleteParagraph(
        a.filePath as string,
        a.index as number,
      );
    default:
      return { error: `Unknown frontend tool: ${call.name}` };
  }
}

export async function executeFrontendTools(
  calls: ToolCall[],
  ctx: FrontendToolContext = {},
): Promise<ToolResult[]> {
  const frontendCalls = calls.filter((c) => isFrontendTool(c.name));
  return Promise.all(
    frontendCalls.map(async (c) => ({
      name: c.name,
      result: await executeOne(c, ctx).catch((e: unknown) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
    })),
  );
}
