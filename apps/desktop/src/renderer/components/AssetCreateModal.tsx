import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
} from "@mui/material";
import { createGlobalAsset } from "../api";

const FILE_TABS = [".txt", ".docx", ".pptx", ".xlsx", ".pdf"] as const;
type FileTab = (typeof FILE_TABS)[number];

const MIME_MAP: Record<string, string> = {
  ".txt": "text/plain",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf",
};

const ACCEPT_MAP: Record<string, string> = {
  ".docx": ".docx",
  ".pptx": ".pptx",
  ".xlsx": ".xlsx",
  ".pdf": ".pdf",
};

export default function AssetCreateModal({
  open,
  onClose,
  repoId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  repoId: number | null;
  onCreated: () => void;
}) {
  const [tab, setTab] = useState<FileTab>(".txt");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTab(".txt");
    setName("");
    setContent("");
    setFile(null);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (tab === ".txt") {
      if (!content) return;
      const fullName = trimmed.endsWith(".txt") ? trimmed : `${trimmed}.txt`;
      await createGlobalAsset(fullName, "text/plain", content, "reference", repoId ?? undefined);
    } else {
      if (!file) return;
      const base64 = await fileToBase64(file);
      const ext = tab;
      const fullName = trimmed.endsWith(ext) ? trimmed : `${trimmed}${ext}`;
      const mime = MIME_MAP[ext] || file.type;
      await createGlobalAsset(fullName, mime, base64, "reference", repoId ?? undefined);
    }

    handleClose();
    onCreated();
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!name.trim()) setName(dropped.name);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!name.trim()) setName(selected.name);
    }
  }

  const isValid = tab === ".txt" ? !!(name.trim() && content) : !!(name.trim() && file);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Asset</DialogTitle>
      <DialogContent>
        <Tabs
          value={FILE_TABS.indexOf(tab)}
          onChange={(_, i) => {
            setTab(FILE_TABS[i]);
            setFile(null);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {FILE_TABS.map((t) => (
            <Tab key={t} label={t} />
          ))}
        </Tabs>

        <TextField
          label="Name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          autoFocus
        />

        {tab === ".txt" ? (
          <TextField
            label="Content"
            size="small"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
          />
        ) : (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            sx={{
              border: "2px dashed",
              borderColor: dragOver ? "primary.main" : "divider",
              borderRadius: 1,
              p: 3,
              textAlign: "center",
              bgcolor: dragOver ? "action.hover" : "transparent",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_MAP[tab]}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {file ? (
              <Typography variant="body2">{file.name}</Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Drop a {tab} file here or
                </Typography>
                <Button size="small" sx={{ mt: 1 }}>
                  Browse
                </Button>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!isValid}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
