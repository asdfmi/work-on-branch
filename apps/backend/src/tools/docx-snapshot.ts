import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "docx_snapshot",
  description: "Copy a DOCX file to preserve the original as a snapshot",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sourcePath: {
        type: SchemaType.STRING,
        description: "Absolute path to the source DOCX file",
      },
      destPath: {
        type: SchemaType.STRING,
        description: "Absolute path for the snapshot copy",
      },
    },
    required: ["sourcePath", "destPath"],
  },
};

export async function execute(): Promise<object> {
  return { error: "docx_snapshot is executed on the frontend" };
}
