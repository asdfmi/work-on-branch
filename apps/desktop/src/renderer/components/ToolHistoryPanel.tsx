import { useState } from "react";
import { Box, Typography } from "@mui/material";

export interface ToolHistoryEntry {
  id: number;
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

function ToolHistoryItem({ entry }: { entry: ToolHistoryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.5 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        sx={{ cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Typography
          variant="body2"
          sx={{ opacity: 0.5, fontSize: "0.75rem", flexShrink: 0 }}
        >
          {open ? "\u25BC" : "\u25B6"}
        </Typography>
        <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
          {entry.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {JSON.stringify(entry.args)}
        </Typography>
      </Box>
      {open && (
        <Box
          sx={{
            mt: 0.5,
            p: 1,
            bgcolor: "grey.900",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.8rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: "20vh",
            overflow: "auto",
          }}
        >
          {JSON.stringify(entry.result, null, 2)}
        </Box>
      )}
    </Box>
  );
}

export default function ToolHistoryPanel({
  entries,
}: {
  entries: ToolHistoryEntry[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;
  return (
    <Box
      sx={{
        maxHeight: collapsed ? "auto" : "30vh",
        overflow: collapsed ? "hidden" : "auto",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "grey.900",
        fontSize: "0.85rem",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          px: 1,
          pt: 0.5,
          pb: 0.5,
          display: "block",
          opacity: 0.6,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? "\u25B6" : "\u25BC"} Tool Calls ({entries.length})
      </Typography>
      {!collapsed &&
        entries.map((entry) => (
          <ToolHistoryItem key={entry.id} entry={entry} />
        ))}
    </Box>
  );
}
