import type { ChatAttachment } from "@repo/domain";

export function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
