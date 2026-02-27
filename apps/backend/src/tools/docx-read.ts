import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "docx_read",
  description:
    "Read a DOCX file and return all paragraphs with their indices and text content",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filePath: {
        type: SchemaType.STRING,
        description: "Absolute path to the DOCX file",
      },
    },
    required: ["filePath"],
  },
};

export async function execute(): Promise<object> {
  return { error: "docx_read is executed on the frontend" };
}
