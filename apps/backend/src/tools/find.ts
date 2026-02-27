import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "find",
  description:
    "Find files and directories matching a glob pattern under a directory. Returns a list of matching paths.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the directory to search in",
      },
      glob: {
        type: SchemaType.STRING,
        description:
          'Glob pattern to match (e.g. "*.ts", "**/*.json", "report-*")',
      },
    },
    required: ["path", "glob"],
  },
};

export async function execute(): Promise<object> {
  return { error: "find is executed on the frontend" };
}
