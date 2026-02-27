import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Collapse,
  TextField,
  IconButton,
  InputBase,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import type { RepoSummary, SessionSummary, AssetSummary } from "@repo/domain";
import {
  fetchRepos,
  fetchSessions,
  createSession,
  createRepo,
  fetchGlobalAssets,
  deleteGlobalAsset,
  deleteSession,
  updateSession,
  updateRepo,
  updateAsset,
} from "../api";
import AssetCreateModal from "./AssetCreateModal";

export default function Sidebar({
  refreshKey,
  selectedRepoId,
  selectedSessionId,
  onSelectRepo,
  onSelectSession,
  onInjectAsset,
}: {
  refreshKey: number;
  selectedRepoId: number | null;
  selectedSessionId: number | null;
  onSelectRepo: (id: number | null, name?: string) => void;
  onSelectSession: (sessionId: number | null, repoId: number | null, sessionName?: string, repoName?: string) => void;
  onInjectAsset: (assetId: number) => void;
}) {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [globalSessions, setGlobalSessions] = useState<SessionSummary[]>([]);
  const [repoSessions, setRepoSessions] = useState<
    Record<number, SessionSummary[]>
  >({});
  const [expandedRepos, setExpandedRepos] = useState<Set<number>>(new Set());
  const [globalExpanded, setGlobalExpanded] = useState(true);
  const [newRepoName, setNewRepoName] = useState("");
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [globalAssets, setGlobalAssets] = useState<AssetSummary[]>([]);
  const [globalAssetsExpanded, setGlobalAssetsExpanded] = useState(true);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: "session" | "repo" | "asset";
    id: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchRepos()
      .then(setRepos)
      .catch(() => {});
    fetchSessions(null)
      .then(setGlobalSessions)
      .catch(() => {});
    fetchGlobalAssets()
      .then(setGlobalAssets)
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    for (const repoId of expandedRepos) {
      fetchSessions(repoId)
        .then((s) => setRepoSessions((prev) => ({ ...prev, [repoId]: s })))
        .catch(() => {});
    }
  }, [expandedRepos, refreshKey]);

  function toggleRepo(repoId: number) {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  }

  async function handleNewGlobalChat() {
    const session = await createSession(null);
    setGlobalSessions((prev) => [...prev, session]);
    onSelectSession(session.id, null, session.title);
  }

  async function handleNewRepoChat(repoId: number) {
    const session = await createSession(repoId);
    const repo = repos.find((r) => r.id === repoId);
    setRepoSessions((prev) => ({
      ...prev,
      [repoId]: [...(prev[repoId] ?? []), session],
    }));
    onSelectSession(session.id, repoId, session.title, repo?.name);
  }

  async function handleCreateRepo() {
    const name = newRepoName.trim();
    if (!name) return;
    const repo = await createRepo(name);
    setRepos((prev) => [...prev, repo]);
    setNewRepoName("");
    setShowNewRepo(false);
    onSelectRepo(repo.id, repo.name);
    setExpandedRepos((prev) => new Set(prev).add(repo.id));
  }

  async function commitRename() {
    if (!editingItem) return;
    const val = editValue.trim();
    if (!val) {
      setEditingItem(null);
      return;
    }
    const { type, id } = editingItem;
    if (type === "session") {
      await updateSession(id, val);
      setGlobalSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: val } : s)),
      );
      setRepoSessions((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[Number(key)] = next[Number(key)].map((s) =>
            s.id === id ? { ...s, title: val } : s,
          );
        }
        return next;
      });
    } else if (type === "repo") {
      await updateRepo(id, val);
      setRepos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: val } : r)),
      );
    } else {
      await updateAsset(id, val);
      setGlobalAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: val } : a)),
      );
    }
    setEditingItem(null);
  }

  function handleAssetCreated() {
    fetchGlobalAssets()
      .then(setGlobalAssets)
      .catch(() => {});
  }

  return (
    <Box
      sx={{
        flex: 1.5,
        minWidth: 0,
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* General section */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <ListItemButton onClick={() => setGlobalExpanded((v) => !v)} dense>
          {globalExpanded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
          <Typography variant="subtitle2" sx={{ ml: 0.5 }}>
            General
          </Typography>
        </ListItemButton>
        <Collapse in={globalExpanded}>
          <List dense disablePadding sx={{ pl: 2 }}>
            {globalSessions.map((s) => (
              <ListItemButton
                key={s.id}
                selected={s.id === selectedSessionId}
                onClick={() => onSelectSession(s.id, null, s.title)}
                onDoubleClick={() => {
                  setEditingItem({ type: "session", id: s.id });
                  setEditValue(s.title);
                }}
                sx={{ pr: 0.5 }}
              >
                {editingItem?.type === "session" && editingItem.id === s.id ? (
                  <InputBase
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingItem(null);
                    }}
                    autoFocus
                    fullWidth
                    sx={{ fontSize: "0.875rem" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ListItemText
                    primary={s.title}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                )}
                <IconButton
                  size="small"
                  title="Delete"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${s.title}"?`)) return;
                    await deleteSession(s.id);
                    setGlobalSessions((prev) =>
                      prev.filter((x) => x.id !== s.id),
                    );
                    if (selectedSessionId === s.id) onSelectSession(null, null);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
          <Box px={2} pb={1}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleNewGlobalChat}
              fullWidth
            >
              New Chat
            </Button>
          </Box>
        </Collapse>
      </Box>

      {/* Repos + sessions */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Box
          sx={{
            p: 1,
            pb: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2" sx={{ px: 1 }}>
            Repositories
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowNewRepo((v) => !v)}
          >
            New
          </Button>
        </Box>
        <Collapse in={showNewRepo}>
          <Box display="flex" gap={0.5} px={1} pb={1}>
            <TextField
              size="small"
              placeholder="Repository name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateRepo();
                if (e.key === "Escape") {
                  setShowNewRepo(false);
                  setNewRepoName("");
                }
              }}
              fullWidth
              autoFocus
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateRepo}
              disabled={!newRepoName.trim()}
            >
              Create
            </Button>
          </Box>
        </Collapse>
        <List dense disablePadding>
          {repos.map((r) => {
            const expanded = expandedRepos.has(r.id);
            const sessions = repoSessions[r.id] ?? [];
            return (
              <Box key={r.id}>
                <ListItemButton
                  onClick={() => {
                    toggleRepo(r.id);
                    onSelectRepo(r.id, r.name);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingItem({ type: "repo", id: r.id });
                    setEditValue(r.name);
                  }}
                  selected={r.id === selectedRepoId && !selectedSessionId}
                  dense
                >
                  {expanded ? (
                    <ExpandMoreIcon fontSize="small" />
                  ) : (
                    <ChevronRightIcon fontSize="small" />
                  )}
                  {editingItem?.type === "repo" && editingItem.id === r.id ? (
                    <InputBase
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingItem(null);
                      }}
                      autoFocus
                      fullWidth
                      sx={{ fontSize: "0.875rem", ml: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <Typography variant="body2" noWrap sx={{ ml: 0.5 }}>
                      {r.name}
                    </Typography>
                  )}
                </ListItemButton>
                <Collapse in={expanded}>
                  <List dense disablePadding sx={{ pl: 3 }}>
                    {sessions.map((s) => (
                      <ListItemButton
                        key={s.id}
                        selected={s.id === selectedSessionId}
                        onClick={() => onSelectSession(s.id, r.id, s.title, r.name)}
                        onDoubleClick={() => {
                          setEditingItem({ type: "session", id: s.id });
                          setEditValue(s.title);
                        }}
                        sx={{ pr: 0.5 }}
                      >
                        {editingItem?.type === "session" &&
                        editingItem.id === s.id ? (
                          <InputBase
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setEditingItem(null);
                            }}
                            autoFocus
                            fullWidth
                            sx={{ fontSize: "0.875rem" }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <ListItemText
                            primary={s.title}
                            primaryTypographyProps={{
                              variant: "body2",
                              noWrap: true,
                            }}
                          />
                        )}
                        <IconButton
                          size="small"
                          title="Delete"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Delete "${s.title}"?`)) return;
                            await deleteSession(s.id);
                            setRepoSessions((prev) => ({
                              ...prev,
                              [r.id]: (prev[r.id] ?? []).filter(
                                (x) => x.id !== s.id,
                              ),
                            }));
                            if (selectedSessionId === s.id)
                              onSelectSession(null, null);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                  <Box px={3} pb={1}>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleNewRepoChat(r.id)}
                      fullWidth
                    >
                      New Chat
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
          {repos.length === 0 && !showNewRepo && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
              No repositories yet
            </Typography>
          )}
        </List>
      </Box>

      {/* Global Assets section */}
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        <ListItemButton
          onClick={() => setGlobalAssetsExpanded((v) => !v)}
          dense
        >
          {globalAssetsExpanded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
          <Typography variant="subtitle2" sx={{ ml: 0.5 }}>
            Global Assets
          </Typography>
        </ListItemButton>
        <Collapse in={globalAssetsExpanded}>
          <List dense disablePadding sx={{ pl: 2 }}>
            {globalAssets.map((asset) => (
              <ListItemButton
                key={asset.id}
                dense
                disableRipple
                onDoubleClick={() => {
                  setEditingItem({ type: "asset", id: asset.id });
                  setEditValue(asset.name);
                }}
                sx={{ pr: 0.5 }}
              >
                {editingItem?.type === "asset" &&
                editingItem.id === asset.id ? (
                  <InputBase
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingItem(null);
                    }}
                    autoFocus
                    fullWidth
                    sx={{ fontSize: "0.875rem" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ListItemText
                    primary={asset.name}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                )}
                <IconButton
                  size="small"
                  title="Inject into chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInjectAsset(asset.id);
                  }}
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="Delete"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${asset.name}"?`)) return;
                    await deleteGlobalAsset(asset.id);
                    setGlobalAssets((prev) =>
                      prev.filter((a) => a.id !== asset.id),
                    );
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
            {globalAssets.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2, pb: 1, display: "block" }}
              >
                No global assets
              </Typography>
            )}
          </List>
          <Box px={2} pb={1}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAssetModalOpen(true)}
              fullWidth
            >
              New
            </Button>
          </Box>
        </Collapse>
      </Box>
      <AssetCreateModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        repoId={null}
        onCreated={handleAssetCreated}
      />
    </Box>
  );
}
