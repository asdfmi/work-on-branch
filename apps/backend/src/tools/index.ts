import type { FunctionDeclaration } from "@google/generative-ai";
import * as cat from "./cat.js";
import * as ls from "./ls.js";
import * as tree from "./tree.js";
import * as write from "./write.js";
import * as grep from "./grep.js";
import * as find from "./find.js";
import * as cp from "./cp.js";
import * as mv from "./mv.js";
import * as convertToPdf from "./convert-to-pdf.js";
import * as repoList from "./repo-list.js";
import * as repoGet from "./repo-get.js";
import * as labelList from "./label-list.js";
import * as assetList from "./asset-list.js";
import * as assetCreate from "./asset-create.js";
import * as assetGet from "./asset-get.js";
import * as sessionList from "./session-list.js";
import * as messageList from "./message-list.js";
import * as eventList from "./event-list.js";
import * as eventGet from "./event-get.js";
import * as docxSnapshot from "./docx-snapshot.js";
import * as docxRead from "./docx-read.js";
import * as docxReplaceParagraph from "./docx-replace-paragraph.js";
import * as docxInsertParagraph from "./docx-insert-paragraph.js";
import * as docxDeleteParagraph from "./docx-delete-paragraph.js";

const tools = [
  cat,
  write,
  ls,
  tree,
  grep,
  find,
  cp,
  mv,
  convertToPdf,
  repoList,
  repoGet,
  labelList,
  sessionList,
  messageList,
  assetList,
  assetCreate,
  assetGet,
  eventList,
  eventGet,
  docxSnapshot,
  docxRead,
  docxReplaceParagraph,
  docxInsertParagraph,
  docxDeleteParagraph,
];

const REPO_SCOPED_TOOLS = new Set([
  "session_list",
  "event_list",
  "asset_list",
]);

function stripRepoId(decl: FunctionDeclaration): FunctionDeclaration {
  const clone = structuredClone(decl);
  if (clone.parameters?.properties) {
    delete clone.parameters.properties.repoId;
  }
  if (clone.parameters?.required) {
    clone.parameters.required = clone.parameters.required.filter(
      (r: string) => r !== "repoId",
    );
  }
  return clone;
}

export function getToolDeclarations(): FunctionDeclaration[] {
  return tools.map((t) =>
    REPO_SCOPED_TOOLS.has(t.declaration.name)
      ? stripRepoId(t.declaration)
      : t.declaration,
  );
}

const executors = new Map(tools.map((t) => [t.declaration.name, t.execute]));

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  repoId?: number,
): Promise<object> {
  const execute = executors.get(name);
  if (!execute) throw new Error(`Unknown tool: ${name}`);
  if (repoId && REPO_SCOPED_TOOLS.has(name)) {
    args.repoId = repoId;
  }
  return execute(args);
}
