import { ipcMain } from "electron";
import * as path from "path";
import * as fsPromises from "fs/promises";
import * as os from "os";

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

const BINARY_EXTENSIONS = new Set([
  ".pdf",
  ".pptx",
  ".docx",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".zip",
]);

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".zip": "application/zip",
};

async function buildTree(
  dir: string,
  maxDepth: number,
  current: number,
): Promise<string[]> {
  if (current >= maxDepth) return [];

  let entries;
  try {
    entries = await fsPromises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const prefix = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const childPrefix = isLast ? "    " : "\u2502   ";

    if (entry.isDirectory()) {
      lines.push(prefix + entry.name + "/");
      const children = await buildTree(
        path.join(dir, entry.name),
        maxDepth,
        current + 1,
      );
      for (const child of children) {
        lines.push(childPrefix + child);
      }
    } else {
      lines.push(prefix + entry.name);
    }
  }
  return lines;
}

type GrepMatch = { file: string; line: number; text: string };

const MAX_MATCHES = 50;

async function searchDir(
  dir: string,
  regex: RegExp,
  ext: string | undefined,
  matches: GrepMatch[],
): Promise<void> {
  if (matches.length >= MAX_MATCHES) return;

  let entries;
  try {
    entries = await fsPromises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (matches.length >= MAX_MATCHES) return;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await searchDir(full, regex, ext, matches);
    } else {
      if (ext && !entry.name.endsWith(ext)) continue;
      try {
        const content = await fsPromises.readFile(full, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({ file: full, line: i + 1, text: lines[i].trim() });
            if (matches.length >= MAX_MATCHES) return;
          }
        }
      } catch {
        // skip binary / unreadable files
      }
    }
  }
}

export function registerFsHandlers(): void {
  ipcMain.handle("fs:cat", async (_event, rawPath: string) => {
    const filePath = expandHome(rawPath);
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      const buf = await fsPromises.readFile(filePath);
      return {
        base64: buf.toString("base64"),
        mimeType: EXT_TO_MIME[ext] ?? "application/octet-stream",
      };
    }
    const content = await fsPromises.readFile(filePath, "utf-8");
    return { content };
  });

  ipcMain.handle("fs:ls", async (_event, rawPath: string) => {
    const dirPath = expandHome(rawPath);
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return {
      items: entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      })),
    };
  });

  ipcMain.handle("fs:tree", async (_event, rawPath: string, depth?: number) => {
    const dirPath = expandHome(rawPath);
    const maxDepth = depth ?? 3;
    const lines = await buildTree(dirPath, maxDepth, 0);
    return { tree: dirPath + "/\n" + lines.join("\n") };
  });

  ipcMain.handle(
    "fs:grep",
    async (_event, pattern: string, rawPath: string, glob?: string) => {
      const dirPath = expandHome(rawPath);
      const regex = new RegExp(pattern, "i");
      const matches: GrepMatch[] = [];
      await searchDir(dirPath, regex, glob, matches);
      return { matches, truncated: matches.length >= MAX_MATCHES };
    },
  );

  ipcMain.handle(
    "fs:write",
    async (_event, rawPath: string, content: string) => {
      const filePath = expandHome(rawPath);
      await fsPromises.writeFile(filePath, content, "utf-8");
      return { written: filePath };
    },
  );

  ipcMain.handle(
    "fs:find",
    async (_event, rawPath: string, glob: string) => {
      const dirPath = expandHome(rawPath);
      const matches: string[] = [];
      const MAX_FIND = 200;

      // Convert simple glob to regex
      const regexStr = glob
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "\0")
        .replace(/\*/g, "[^/]*")
        .replace(/\0/g, ".*")
        .replace(/\?/g, ".");
      const regex = new RegExp(`^${regexStr}$`);

      async function walk(dir: string, rel: string): Promise<void> {
        if (matches.length >= MAX_FIND) return;
        let entries;
        try {
          entries = await fsPromises.readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (matches.length >= MAX_FIND) return;
          if (entry.name === "node_modules" || entry.name === ".git") continue;
          const childRel = rel ? rel + "/" + entry.name : entry.name;
          if (regex.test(childRel) || regex.test(entry.name)) {
            matches.push(path.join(dir, entry.name));
          }
          if (entry.isDirectory()) {
            await walk(path.join(dir, entry.name), childRel);
          }
        }
      }

      await walk(dirPath, "");
      return { matches, truncated: matches.length >= MAX_FIND };
    },
  );

  ipcMain.handle(
    "fs:cp",
    async (_event, rawSrc: string, rawDest: string) => {
      const src = expandHome(rawSrc);
      const dest = expandHome(rawDest);
      await fsPromises.cp(src, dest, { recursive: true });
      return { copied: dest };
    },
  );

  ipcMain.handle(
    "fs:mv",
    async (_event, rawSrc: string, rawDest: string) => {
      const src = expandHome(rawSrc);
      const dest = expandHome(rawDest);
      await fsPromises.rename(src, dest);
      return { moved: dest };
    },
  );

  ipcMain.handle("fs:convertToPdf", async (_event, rawPath: string) => {
    const filePath = expandHome(rawPath);
    const converterUrl = process.env.CONVERTER_URL;
    if (!converterUrl) throw new Error("CONVERTER_URL is not set");

    const buf = await fsPromises.readFile(filePath);
    const fileName = path.basename(filePath);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buf)]), fileName);

    const res = await fetch(`${converterUrl}/convert`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Conversion failed: ${await res.text()}`);
    }

    const pdfBuf = Buffer.from(await res.arrayBuffer());
    return { base64: pdfBuf.toString("base64"), mimeType: "application/pdf" };
  });
}
