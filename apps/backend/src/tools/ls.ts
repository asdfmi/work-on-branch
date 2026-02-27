import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "ls",
  description: "List files and directories in the specified directory",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the directory to list",
      },
    },
    required: ["path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "ls is executed on the frontend" };
}
