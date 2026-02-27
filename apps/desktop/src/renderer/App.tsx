import { useState, useRef, useEffect, useCallback } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  LinearProgress,
} from "@mui/material";
import type {
  ChatAttachment,
  ChatResult,
  ToolCall,
  ToolExecutionResult,
} from "@repo/domain";
import {
  sendMessage,
  sendApproval,
  fetchSessionMessages,
  fetchAsset,
} from "./api";
import { fileToAttachment } from "./utils";
import { executeFrontendTools, isFrontendTool } from "./ipc-tools";
import Sidebar from "./components/Sidebar";
import EventTimeline from "./components/EventTimeline";
import ToolHistoryPanel, {
  type ToolHistoryEntry,
} from "./components/ToolHistoryPanel";
import MessageList, {
  type Message,
  sessionMessagesToDisplayMessages,
} from "./components/MessageList";
import ToolApprovalBar from "./components/ToolApprovalBar";
import ChatInput from "./components/ChatInput";

const darkTheme = createTheme({ palette: { mode: "dark" } });

const TOOL_HISTORY_MAX = 50;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingCalls, setPendingCalls] = useState<ToolCall[] | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(null);
  const [toolHistory, setToolHistory] = useState<ToolHistoryEntry[]>([]);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const nextToolId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const respondingRef = useRef(false);

  const addToolEntries = useCallback((results: ToolExecutionResult[]) => {
    setToolHistory((prev) => {
      const entries = results.map((r) => ({
        id: nextToolId.current++,
        name: r.name,
        args: r.args,
        result: r.result,
      }));
      const merged = [...prev, ...entries];
      return merged.length > TOOL_HISTORY_MAX
        ? merged.slice(merged.length - TOOL_HISTORY_MAX)
        : merged;
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingCalls]);

  // Load messages when session changes
  useEffect(() => {
    setToolHistory([]);
    if (!selectedSessionId) {
      setMessages([]);
      setPendingCalls(null);
      return;
    }
    fetchSessionMessages(selectedSessionId)
      .then((msgs) => {
        setMessages(sessionMessagesToDisplayMessages(msgs));
      })
      .catch(() => setMessages([]));
  }, [selectedSessionId]);

  async function handleResult(result: ChatResult) {
    if (result.toolResults && result.toolResults.length > 0) {
      addToolEntries(result.toolResults);
    }
    if (result.type === "reply") {
      setMessages((prev) => [...prev, { text: result.reply, role: "ai" }]);
      setSending(false);
      setRefreshKey((k) => k + 1);
    } else {
      if (result.reply) {
        setMessages((prev) => [...prev, { text: result.reply!, role: "ai" }]);
      }
      setPendingCalls(result.calls);
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending || !selectedSessionId)
      return;

    const currentAttachments = attachments;
    setMessages((prev) => [
      ...prev,
      {
        text: text || "(attachments)",
        role: "user",
        attachments: currentAttachments.map((a) => ({ name: a.name })),
      },
    ]);
    setInput("");
    setAttachments([]);
    setSending(true);

    try {
      const result = await sendMessage(
        text,
        selectedSessionId,
        currentAttachments.length > 0 ? currentAttachments : undefined,
      );
      await handleResult(result);
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Failed to get response.", role: "ai" },
      ]);
      setSending(false);
    }
  }

  const respond = useCallback(
    async (approved: boolean) => {
      if (respondingRef.current) return;
      if (!pendingCalls || !selectedSessionId) return;
      respondingRef.current = true;
      const calls = pendingCalls;
      setPendingCalls(null);

      if (!approved) {
        addToolEntries(
          calls.map((c) => ({
            name: c.name,
            args: c.args,
            result: { denied: true },
          })),
        );
        setSending(false);
        respondingRef.current = false;
        return;
      }

      try {
        const hasFrontend = calls.some((c) => isFrontendTool(c.name));
        const toolResults = hasFrontend
          ? await executeFrontendTools(calls, { repoId: selectedRepoId })
          : undefined;
        const result = await sendApproval(true, selectedSessionId, toolResults);
        await handleResult(result);
      } catch {
        setMessages((prev) => [
          ...prev,
          { text: "Failed to get response.", role: "ai" },
        ]);
        setSending(false);
      } finally {
        respondingRef.current = false;
      }
    },
    [pendingCalls, selectedSessionId, addToolEntries],
  );

  useEffect(() => {
    if (!pendingCalls) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        respond(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        respond(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingCalls, respond]);

  async function handleFiles(files: FileList | File[]) {
    const newAttachments = await Promise.all(
      Array.from(files).map(fileToAttachment),
    );
    setAttachments((prev) => [...prev, ...newAttachments]);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      handleFiles(files);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSelectSession(
    sessionId: number | null,
    repoId: number | null,
    sessionName?: string,
    repoName?: string,
  ) {
    setSelectedSessionId(sessionId);
    setSelectedSessionName(sessionName ?? null);
    setSelectedRepoId(repoId);
    setSelectedRepoName(repoName ?? null);
  }

  function handleSelectRepo(repoId: number | null, repoName?: string) {
    setSelectedRepoId(repoId);
    setSelectedRepoName(repoName ?? null);
  }

  async function handleInjectAsset(assetId: number) {
    if (!selectedSessionId) {
      alert("Please open a session first");
      return;
    }
    try {
      const asset = await fetchAsset(assetId);
      const base64 = asset.mimeType.startsWith("text/")
        ? btoa(
            new TextEncoder()
              .encode(asset.content)
              .reduce((s, b) => s + String.fromCharCode(b), ""),
          )
        : asset.content; // already base64 for binary assets
      setAttachments((prev) => [
        ...prev,
        { name: asset.name, mimeType: asset.mimeType, base64 },
      ]);
    } catch {
      alert("Failed to load asset.");
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box display="flex" flexDirection="column" height="100vh">
        {/* Top bar: active repo / session */}
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedRepoName ?? "No repo"}
          </Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2">
            {selectedSessionName ?? "No session"}
          </Typography>
        </Box>
        <Box display="flex" flexDirection="row" flex={1} minHeight={0}>
        <Sidebar
          refreshKey={refreshKey}
          selectedRepoId={selectedRepoId}
          selectedSessionId={selectedSessionId}
          onSelectRepo={handleSelectRepo}
          onSelectSession={handleSelectSession}
          onInjectAsset={handleInjectAsset}
        />
        {!timelineExpanded && (
          <Box
            display="flex"
            flexDirection="column"
            flex={4}
            minWidth={0}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {selectedSessionId ? (
              <>
                <MessageList ref={bottomRef} messages={messages} />

                {sending && !pendingCalls && <LinearProgress />}
                {pendingCalls && <ToolApprovalBar calls={pendingCalls} />}
                <ToolHistoryPanel entries={toolHistory} />

                <ChatInput
                  input={input}
                  onInputChange={setInput}
                  onSend={send}
                  onPaste={handlePaste}
                  onFiles={(files) => handleFiles(files)}
                  sending={sending}
                  attachments={attachments}
                  onRemoveAttachment={removeAttachment}
                />
              </>
            ) : (
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography variant="h6" color="text.secondary">
                  Select or create a chat session
                </Typography>
              </Box>
            )}
          </Box>
        )}
        <EventTimeline
          repoId={selectedRepoId}
          refreshKey={refreshKey}
          expanded={timelineExpanded}
          onToggleExpand={() => setTimelineExpanded((v) => !v)}
        />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
