import { Box, Typography } from "@mui/material";
import type { ToolCall } from "@repo/domain";

export default function ToolApprovalBar({ calls }: { calls: ToolCall[] }) {
  return (
    <Box px={1.5} py={1} borderTop={1} borderColor="divider" bgcolor="grey.900">
      {calls.map((call, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
            {call.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            color="text.secondary"
          >
            {JSON.stringify(call.args)}
          </Typography>
        </Box>
      ))}
      <Typography variant="caption" color="text.secondary">
        Enter: approve / Esc: deny
      </Typography>
    </Box>
  );
}
