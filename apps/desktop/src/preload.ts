import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fs", {
  cat: (filePath: string) => ipcRenderer.invoke("fs:cat", filePath),
  ls: (dirPath: string) => ipcRenderer.invoke("fs:ls", dirPath),
  tree: (dirPath: string, depth?: number) =>
    ipcRenderer.invoke("fs:tree", dirPath, depth),
  grep: (pattern: string, dirPath: string, glob?: string) =>
    ipcRenderer.invoke("fs:grep", pattern, dirPath, glob),
  write: (filePath: string, content: string) =>
    ipcRenderer.invoke("fs:write", filePath, content),
  find: (dirPath: string, glob: string) =>
    ipcRenderer.invoke("fs:find", dirPath, glob),
  cp: (src: string, dest: string) => ipcRenderer.invoke("fs:cp", src, dest),
  mv: (src: string, dest: string) => ipcRenderer.invoke("fs:mv", src, dest),
  convertToPdf: (filePath: string) =>
    ipcRenderer.invoke("fs:convertToPdf", filePath),
});

contextBridge.exposeInMainWorld("docx", {
  snapshot: (sourcePath: string, destPath: string) =>
    ipcRenderer.invoke("docx:snapshot", sourcePath, destPath),
  read: (filePath: string) => ipcRenderer.invoke("docx:read", filePath),
  replaceParagraph: (filePath: string, index: number, newText: string) =>
    ipcRenderer.invoke("docx:replaceParagraph", filePath, index, newText),
  insertParagraph: (filePath: string, afterIndex: number, text: string) =>
    ipcRenderer.invoke("docx:insertParagraph", filePath, afterIndex, text),
  deleteParagraph: (filePath: string, index: number) =>
    ipcRenderer.invoke("docx:deleteParagraph", filePath, index),
});
