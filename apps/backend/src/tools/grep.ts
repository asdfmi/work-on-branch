import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "grep",
  description:
    "Recursively search for a pattern in files under a directory. Returns matching lines with file paths and line numbers.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      pattern: {
        type: SchemaType.STRING,
        description: "Text pattern to search for (case-insensitive)",
      },
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the directory to search in",
      },
      glob: {
        type: SchemaType.STRING,
        description:
          "Optional file extension filter, e.g. '.ts' or '.pdf' (default: all files)",
      },
    },
    required: ["pattern", "path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "grep is executed on the frontend" };
}
