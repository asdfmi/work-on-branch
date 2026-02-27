import { useRef } from "react";
import { Box, TextField, Button, Chip, IconButton } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import type { ChatAttachment } from "@repo/domain";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onFiles: (files: FileList) => void;
  sending: boolean;
  attachments: ChatAttachment[];
  onRemoveAttachment: (index: number) => void;
}

export default function ChatInput({
  input,
  onInputChange,
  onSend,
  onPaste,
  onFiles,
  sending,
  attachments,
  onRemoveAttachment,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {attachments.length > 0 && (
        <Box display="flex" gap={0.5} flexWrap="wrap" px={1.5} pt={1}>
          {attachments.map((a, i) => (
            <Chip
              key={i}
              label={a.name}
              size="small"
              onDelete={() => onRemoveAttachment(i)}
              deleteIcon={<CloseIcon />}
            />
          ))}
        </Box>
      )}
      <Box
        display="flex"
        gap={1}
        p={1.5}
        borderTop={1}
        borderColor="divider"
        alignItems="center"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          onPaste={onPaste}
          disabled={sending}
        />
        <Button
          variant="contained"
          onClick={onSend}
          disabled={sending || (!input.trim() && attachments.length === 0)}
        >
          Send
        </Button>
      </Box>
    </>
  );
}
