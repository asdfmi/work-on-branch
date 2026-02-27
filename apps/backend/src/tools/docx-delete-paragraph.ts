import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "docx_delete_paragraph",
  description: "Delete a paragraph from a DOCX file by its index",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filePath: {
        type: SchemaType.STRING,
        description: "Absolute path to the DOCX file",
      },
      index: {
        type: SchemaType.NUMBER,
        description: "Paragraph index (0-based) to delete",
      },
    },
    required: ["filePath", "index"],
  },
};

export async function execute(): Promise<object> {
  return { error: "docx_delete_paragraph is executed on the frontend" };
}
