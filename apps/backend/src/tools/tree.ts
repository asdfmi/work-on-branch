import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "tree",
  description:
    "Recursively list the directory structure as a tree. Useful for exploring project layouts.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the root directory",
      },
      depth: {
        type: SchemaType.NUMBER,
        description: "Maximum depth to recurse (default 3)",
      },
    },
    required: ["path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "tree is executed on the frontend" };
}
