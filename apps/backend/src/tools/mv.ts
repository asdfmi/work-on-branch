import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "mv",
  description: "Move or rename a file or directory.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      src: {
        type: SchemaType.STRING,
        description: "Absolute path to the source file or directory",
      },
      dest: {
        type: SchemaType.STRING,
        description: "Absolute path to the destination",
      },
    },
    required: ["src", "dest"],
  },
};

export async function execute(): Promise<object> {
  return { error: "mv is executed on the frontend" };
}
