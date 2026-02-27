import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "write",
  description:
    "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the file to write",
      },
      content: {
        type: SchemaType.STRING,
        description: "Content to write to the file",
      },
    },
    required: ["path", "content"],
  },
};

export async function execute(): Promise<object> {
  return { error: "write is executed on the frontend" };
}
