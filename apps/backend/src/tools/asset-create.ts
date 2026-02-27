import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const declaration: FunctionDeclaration = {
  name: "asset_create",
  description:
    "Create an asset from a local file and optionally link it to an event. Reads the file, stores it as an asset, and links to the specified event if eventId is provided.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description: "Absolute path to the file",
      },
      eventId: {
        type: SchemaType.INTEGER,
        description: "Event ID to link the asset to (optional)",
      },
      name: {
        type: SchemaType.STRING,
        description:
          "Name for the asset (optional, defaults to filename)",
      },
    },
    required: ["path"],
  },
};

export async function execute(): Promise<object> {
  return { error: "asset_create is executed on the frontend" };
}
