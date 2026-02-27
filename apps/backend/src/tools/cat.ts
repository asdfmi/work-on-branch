import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "cat",
  description:
    "Read the contents of a local file. Returns text for text files, or base64 + mimeType for binary files (PDF, images, etc.)",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the file to read",
      },
    },
    required: ["path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "cat is executed on the frontend" };
}
