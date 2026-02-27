import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "docx_replace_paragraph",
  description: "Replace the text of a paragraph in a DOCX file by its index",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filePath: {
        type: SchemaType.STRING,
        description: "Absolute path to the DOCX file",
      },
      index: {
        type: SchemaType.NUMBER,
        description: "Paragraph index (0-based)",
      },
      newText: {
        type: SchemaType.STRING,
        description: "New text for the paragraph",
      },
    },
    required: ["filePath", "index", "newText"],
  },
};

export async function execute(): Promise<object> {
  return { error: "docx_replace_paragraph is executed on the frontend" };
}
