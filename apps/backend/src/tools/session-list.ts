import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { findSessionsByRepoId } from "../repository.js";

export const declaration: FunctionDeclaration = {
  name: "session_list",
  description: "List chat sessions in a repository",
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
  const rows = findSessionsByRepoId(args.repoId);
  return { sessions: rows };
}
