import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "convert_to_pdf",
  description:
    "Convert a PPTX, DOCX, or XLSX file to PDF, then return the PDF as base64. Use this before reading Office documents.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the Office file (.pptx, .docx, .xlsx)",
      },
    },
    required: ["path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "convert_to_pdf is executed on the frontend" };
}
