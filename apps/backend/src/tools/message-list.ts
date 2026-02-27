import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { findParsedMessagesBySessionId } from "../repository.js";

export const declaration: FunctionDeclaration = {
  name: "message_list",
  description: "List messages in a chat session",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: {
        type: SchemaType.INTEGER,
        description: "Session ID",
      },
    },
    required: ["sessionId"],
  },
};

type Args = { sessionId: number };

export async function execute(raw: Record<string, unknown>): Promise<object> {
  const args = raw as Args;
  const rows = findParsedMessagesBySessionId(args.sessionId);
  return { messages: rows };
}
