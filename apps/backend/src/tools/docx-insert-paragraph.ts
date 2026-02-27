import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "docx_insert_paragraph",
  description:
    "Insert a new paragraph into a DOCX file after the specified index (-1 to insert at the beginning)",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filePath: {
        type: SchemaType.STRING,
        description: "Absolute path to the DOCX file",
      },
      afterIndex: {
        type: SchemaType.NUMBER,
        description: "Insert after this paragraph index (-1 for beginning)",
      },
      text: {
        type: SchemaType.STRING,
        description: "Text for the new paragraph",
      },
    },
    required: ["filePath", "afterIndex", "text"],
  },
};

export async function execute(): Promise<object> {
  return { error: "docx_insert_paragraph is executed on the frontend" };
}
