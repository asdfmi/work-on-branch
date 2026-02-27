const CONVERTIBLE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isConvertible(mimeType: string): boolean {
  return CONVERTIBLE_MIMES.has(mimeType);
}

export async function convertToPdf(
  base64: string,
  mimeType: string,
  name: string,
) {
  const converterUrl = process.env.CONVERTER_URL;
  if (!converterUrl) throw new Error("CONVERTER_URL is not set");
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(base64, "base64")], { type: mimeType }),
    name,
  );
  const res = await fetch(`${converterUrl}/convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Conversion failed: ${await res.text()}`);
  return {
    base64: Buffer.from(await res.arrayBuffer()).toString("base64"),
    mimeType: "application/pdf",
  };
}
