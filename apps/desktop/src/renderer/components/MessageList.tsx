import { forwardRef } from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import type { SessionMessage } from "@repo/domain";

export interface Message {
  text: string;
  role: "user" | "ai";
  attachments?: { name: string }[];
}

export function sessionMessagesToDisplayMessages(
  msgs: SessionMessage[],
): Message[] {
  const result: Message[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      const textParts = (m.parts as { text?: string }[]).filter((p) => p.text);
      const text = textParts.map((p) => p.text).join("\n") || "(attachments)";
      const hasInline = (m.parts as { inlineData?: unknown }[]).some(
        (p) => p.inlineData,
      );
      const hasFunctionResponse = (
        m.parts as { functionResponse?: unknown }[]
      ).some((p) => p.functionResponse);
      if (hasFunctionResponse) continue;
      result.push({
        text,
        role: "user",
        attachments: hasInline ? [{ name: "attachment" }] : undefined,
      });
    } else if (m.role === "model") {
      const textParts = (m.parts as { text?: string }[]).filter((p) => p.text);
      const text = textParts.map((p) => p.text).join("\n");
      const hasFunctionCall = (m.parts as { functionCall?: unknown }[]).some(
        (p) => p.functionCall,
      );
      if (hasFunctionCall && !text) continue;
      if (text) {
        result.push({ text, role: "ai" });
      }
    }
  }
  return result;
}

const MessageList = forwardRef<HTMLDivElement, { messages: Message[] }>(
  function MessageList({ messages }, ref) {
    return (
      <Box
        flex={1}
        overflow="auto"
        p={2}
        display="flex"
        flexDirection="column"
        gap={1}
      >
        {messages.map((msg, i) => (
          <Box
            key={i}
            display="flex"
            justifyContent={msg.role === "user" ? "flex-end" : "flex-start"}
          >
            <Paper
              sx={{
                px: 2,
                py: 1,
                maxWidth: "80%",
                bgcolor: "grey.800",
              }}
            >
              <Typography
                whiteSpace="pre-wrap"
                sx={{ wordBreak: "break-word" }}
              >
                {msg.text}
              </Typography>
              {msg.attachments && msg.attachments.length > 0 && (
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                  {msg.attachments.map((a, j) => (
                    <Chip
                      key={j}
                      label={a.name}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        ))}
        <div ref={ref} />
      </Box>
    );
  },
);

export default MessageList;
