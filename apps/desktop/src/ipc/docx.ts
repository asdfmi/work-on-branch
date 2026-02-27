import { ipcMain } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import JSZip from "jszip";

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function loadDocx(filePath: string): Promise<JSZip> {
  const buf = fs.readFileSync(filePath);
  return JSZip.loadAsync(buf);
}

async function saveDocx(zip: JSZip, filePath: string): Promise<void> {
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(filePath, buf);
}

async function getDocumentXml(zip: JSZip): Promise<string> {
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml not found");
  return file.async("string");
}

function extractParagraphs(
  xml: string,
): { start: number; end: number; text: string }[] {
  const paragraphs: { start: number; end: number; text: string }[] = [];
  const regex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const pXml = match[0];
    const texts: string[] = [];
    const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(pXml)) !== null) {
      texts.push(tMatch[1]);
    }
    paragraphs.push({
      start: match.index,
      end: match.index + match[0].length,
      text: texts.join(""),
    });
  }
  return paragraphs;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeRunXml(text: string): string {
  return `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function makeParagraphXml(text: string): string {
  return `<w:p>${makeRunXml(text)}</w:p>`;
}

export function registerDocxHandlers(): void {
  ipcMain.handle(
    "docx:snapshot",
    async (_event, sourcePath: string, destPath: string) => {
      fs.copyFileSync(expandHome(sourcePath), expandHome(destPath));
      return { copied: destPath };
    },
  );

  ipcMain.handle("docx:read", async (_event, filePath: string) => {
    const zip = await loadDocx(expandHome(filePath));
    const xml = await getDocumentXml(zip);
    const paragraphs = extractParagraphs(xml);
    return {
      paragraphs: paragraphs.map((p, i) => ({ index: i, text: p.text })),
    };
  });

  ipcMain.handle(
    "docx:replaceParagraph",
    async (_event, filePath: string, index: number, newText: string) => {
      const zip = await loadDocx(expandHome(filePath));
      const xml = await getDocumentXml(zip);
      const paragraphs = extractParagraphs(xml);
      if (index < 0 || index >= paragraphs.length) {
        throw new Error(
          `Paragraph index ${index} out of range (0-${paragraphs.length - 1})`,
        );
      }
      const p = paragraphs[index];
      const pXml = xml.substring(p.start, p.end);
      const withoutRuns = pXml
        .replace(/<w:r>[\s\S]*?<\/w:r>/g, "")
        .replace(/<w:r\s[\s\S]*?<\/w:r>/g, "");
      const newXml = withoutRuns.replace(
        "</w:p>",
        makeRunXml(newText) + "</w:p>",
      );
      const updatedXml =
        xml.substring(0, p.start) + newXml + xml.substring(p.end);
      zip.file("word/document.xml", updatedXml);
      await saveDocx(zip, expandHome(filePath));
      return { replaced: index, text: newText };
    },
  );

  ipcMain.handle(
    "docx:insertParagraph",
    async (_event, filePath: string, afterIndex: number, text: string) => {
      const zip = await loadDocx(expandHome(filePath));
      const xml = await getDocumentXml(zip);
      const paragraphs = extractParagraphs(xml);
      if (afterIndex < -1 || afterIndex >= paragraphs.length) {
        throw new Error(
          `afterIndex ${afterIndex} out of range (-1 to ${paragraphs.length - 1})`,
        );
      }
      const insertPos =
        afterIndex === -1 ? paragraphs[0].start : paragraphs[afterIndex].end;
      const newParagraph = makeParagraphXml(text);
      const updatedXml =
        xml.substring(0, insertPos) + newParagraph + xml.substring(insertPos);
      zip.file("word/document.xml", updatedXml);
      await saveDocx(zip, expandHome(filePath));
      return { inserted: afterIndex + 1, text };
    },
  );

  ipcMain.handle(
    "docx:deleteParagraph",
    async (_event, filePath: string, index: number) => {
      const zip = await loadDocx(expandHome(filePath));
      const xml = await getDocumentXml(zip);
      const paragraphs = extractParagraphs(xml);
      if (index < 0 || index >= paragraphs.length) {
        throw new Error(
          `Paragraph index ${index} out of range (0-${paragraphs.length - 1})`,
        );
      }
      const p = paragraphs[index];
      const updatedXml = xml.substring(0, p.start) + xml.substring(p.end);
      zip.file("word/document.xml", updatedXml);
      await saveDocx(zip, expandHome(filePath));
      return { deleted: index };
    },
  );
}
