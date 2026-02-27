interface FsApi {
  cat(
    path: string,
  ): Promise<{ content: string } | { base64: string; mimeType: string }>;
  ls(
    path: string,
  ): Promise<{ items: { name: string; isDirectory: boolean }[] }>;
  tree(path: string, depth?: number): Promise<{ tree: string }>;
  grep(
    pattern: string,
    path: string,
    glob?: string,
  ): Promise<{
    matches: { file: string; line: number; text: string }[];
    truncated: boolean;
  }>;
  write(path: string, content: string): Promise<{ written: string }>;
  find(
    path: string,
    glob: string,
  ): Promise<{ matches: string[]; truncated: boolean }>;
  cp(src: string, dest: string): Promise<{ copied: string }>;
  mv(src: string, dest: string): Promise<{ moved: string }>;
  convertToPdf(path: string): Promise<{ base64: string; mimeType: string }>;
}

interface DocxApi {
  snapshot(sourcePath: string, destPath: string): Promise<{ copied: string }>;
  read(
    filePath: string,
  ): Promise<{ paragraphs: { index: number; text: string }[] }>;
  replaceParagraph(
    filePath: string,
    index: number,
    newText: string,
  ): Promise<{ replaced: number; text: string }>;
  insertParagraph(
    filePath: string,
    afterIndex: number,
    text: string,
  ): Promise<{ inserted: number; text: string }>;
  deleteParagraph(
    filePath: string,
    index: number,
  ): Promise<{ deleted: number }>;
}

interface Window {
  fs: FsApi;
  docx: DocxApi;
}
