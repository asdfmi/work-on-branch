import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
} from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Collapse,
  InputBase,
  IconButton,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import LinkIcon from "@mui/icons-material/Link";
import type {
  RepoDetail,
  EventDetail,
  LabelSummary,
  AssetSummary,
} from "@repo/domain";
import {
  fetchRepo,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchLabels,
  createLabel,
  deleteLabel,
  addLabelToEvent,
  fetchGlobalAssets,
  fetchRepoAssets,
  createGlobalAsset,
  addAssetToEvent,
  removeAssetFromEvent,
  deleteGlobalAsset,
  linkEvents,
  unlinkEvents,
} from "../api";
import AssetCreateModal from "./AssetCreateModal";

// --- Helpers ---

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

// --- LabelsBar ---

function LabelsBar({
  allLabels,
  onMutate,
}: {
  allLabels: LabelSummary[];
  onMutate: () => void;
}) {
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    await createLabel(name);
    setNewName("");
    onMutate();
  }

  async function handleDelete(id: number) {
    await deleteLabel(id);
    onMutate();
  }

  function handleDragStart(e: React.DragEvent, labelId: number) {
    e.dataTransfer.setData("application/x-label-id", String(labelId));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        flexWrap: "wrap",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight="bold"
        sx={{ mr: 0.5 }}
      >
        Global Labels
      </Typography>
      {allLabels.map((l) => (
        <Chip
          key={l.id}
          label={l.name}
          size="small"
          draggable
          onDragStart={(e) => handleDragStart(e, l.id)}
          onDelete={() => handleDelete(l.id)}
          sx={{ cursor: "grab" }}
        />
      ))}
      <TextField
        size="small"
        placeholder="New label"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
        }}
        inputProps={{ style: { fontSize: "0.75rem", padding: "4px 8px" } }}
        sx={{ width: 100 }}
      />
      <IconButton size="small" onClick={handleCreate} disabled={!newName.trim()}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// --- AssetsBar ---

function AssetsBar({
  repoAssets,
  repoId,
  onMutate,
}: {
  repoAssets: AssetSummary[];
  repoId: number;
  onMutate: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleDragStart(e: React.DragEvent, assetId: number) {
    e.dataTransfer.setData("application/x-asset-id", String(assetId));
    e.dataTransfer.effectAllowed = "copy";
  }

  async function handleDelete(id: number) {
    await deleteGlobalAsset(id);
    onMutate();
  }

  return (
    <>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight="bold"
          sx={{ mr: 0.5 }}
        >
          Assets
        </Typography>
        {repoAssets.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            size="small"
            draggable
            onDragStart={(e) => handleDragStart(e, a.id)}
            onDelete={() => handleDelete(a.id)}
            sx={{ cursor: "grab" }}
          />
        ))}
        <Button size="small" onClick={() => setModalOpen(true)}>
          New
        </Button>
      </Box>
      <AssetCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        repoId={repoId}
        onCreated={onMutate}
      />
    </>
  );
}

// --- TimelineNode ---

function TimelineNode({
  event,
  allEvents,
  nodeRef,
  onMutate,
}: {
  event: EventDetail;
  allEvents: EventDetail[];
  nodeRef: RefObject<HTMLDivElement | null>;
  onMutate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const isIn = event.direction === "in";

  const linkedIds = new Set([...event.links.outLinks, ...event.links.inLinks]);
  const linkedEvents = allEvents.filter((ev) => linkedIds.has(ev.id));

  async function commitEdit() {
    const val = editValue.trim();
    if (!val || val === event.summary) {
      setEditing(false);
      return;
    }
    await updateEvent(event.id, val);
    setEditing(false);
    onMutate();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete event "${event.summary}"?`)) return;
    await deleteEvent(event.id);
    onMutate();
  }

  // --- Connector handle: drag source for event links ---
  function handleHandleDragStart(e: React.DragEvent) {
    e.stopPropagation();
    e.dataTransfer.setData("application/x-event-id", String(event.id));
    e.dataTransfer.effectAllowed = "all";
  }

  // --- DnD on card (labels, assets, files, AND event links) ---
  function handleDragOver(e: React.DragEvent) {
    if (
      e.dataTransfer.types.includes("application/x-event-id") ||
      e.dataTransfer.types.includes("application/x-label-id") ||
      e.dataTransfer.types.includes("application/x-asset-id") ||
      e.dataTransfer.types.includes("Files")
    ) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const eventId = e.dataTransfer.getData("application/x-event-id");
    if (eventId) {
      const sourceId = Number(eventId);
      if (sourceId !== event.id) {
        await linkEvents(sourceId, event.id);
        onMutate();
      }
      return;
    }

    const labelId = e.dataTransfer.getData("application/x-label-id");
    if (labelId) {
      await addLabelToEvent(event.id, Number(labelId));
      onMutate();
      return;
    }

    const assetId = e.dataTransfer.getData("application/x-asset-id");
    if (assetId) {
      await addAssetToEvent(event.id, Number(assetId));
      onMutate();
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      for (const file of files) {
        const content = await fileToBase64(file);
        const asset = await createGlobalAsset(
          file.name,
          file.type || "application/octet-stream",
          content,
        );
        await addAssetToEvent(event.id, asset.id);
      }
      onMutate();
    }
  }

  const handleSx = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    bgcolor: "#9c27b0",
    border: "2px solid",
    borderColor: "background.paper",
    cursor: "crosshair",
    flexShrink: 0,
    transition: "transform 0.15s, box-shadow 0.15s",
    "&:hover": { transform: "scale(1.4)", boxShadow: 3 },
    ...(dragOver && { transform: "scale(1.5)", boxShadow: 4, bgcolor: "#7b1fa2" }),
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 360 }}>
      {/* Left connector (OUT nodes) */}
      {!isIn && (
        <Box
          draggable
          onDragStart={handleHandleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{ ...handleSx, mr: -0.5, zIndex: 3 }}
        />
      )}
      <Paper
        ref={nodeRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={() => {
          setEditing(true);
          setEditValue(event.summary);
        }}
        sx={{
          p: 1.5,
          flex: 1,
          minWidth: 0,
          bgcolor: isIn ? "rgba(33,150,243,0.08)" : "rgba(76,175,80,0.08)",
          borderLeft: isIn ? 3 : 0,
          borderRight: isIn ? 0 : 3,
          borderColor: isIn ? "info.main" : "success.main",
          outline: dragOver ? "2px solid" : "none",
          outlineColor: dragOver ? "primary.main" : "transparent",
          transition: "outline 0.15s",
        }}
      >
      {/* Summary + delete */}
      <Box display="flex" alignItems="flex-start" gap={0.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <InputBase
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              fullWidth
              multiline
              sx={{ fontSize: "0.85rem", fontWeight: "bold" }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Typography variant="body2" fontWeight="bold" noWrap>
              {event.summary}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {event.createdAt}
          </Typography>
        </Box>
        <IconButton
          size="small"
          title="Delete event"
          onClick={handleDelete}
          sx={{ opacity: 0.4, "&:hover": { opacity: 1, color: "error.main" } }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Labels (display only — attach via DnD from LabelsBar) */}
      {event.labels.length > 0 && (
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {event.labels.map((l) => (
            <Chip key={l.id} label={l.name} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
          ))}
        </Box>
      )}

      {/* Assets (display only — attach via file DnD) */}
      {event.assets.length > 0 && (
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {event.assets.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              size="small"
              variant="outlined"
              onDelete={async () => {
                await removeAssetFromEvent(event.id, a.id);
                onMutate();
              }}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          ))}
        </Box>
      )}

      {/* Links — create via handle DnD, remove via chip × */}
      {linkedEvents.length > 0 && (
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {linkedEvents.map((ev) => (
            <Chip
              key={ev.id}
              icon={<LinkIcon sx={{ fontSize: 12 }} />}
              label={`#${ev.id} ${ev.summary.slice(0, 15)}`}
              size="small"
              onDelete={async () => {
                const isOut = event.links.outLinks.includes(ev.id);
                if (isOut) await unlinkEvents(event.id, ev.id);
                else await unlinkEvents(ev.id, event.id);
                onMutate();
              }}
              sx={{ height: 20, fontSize: "0.65rem" }}
            />
          ))}
        </Box>
      )}
      </Paper>
      {/* Right connector handle (for IN nodes — center-facing side is right) */}
      {isIn && (
        <Box
          draggable
          onDragStart={handleHandleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{ ...handleSx, ml: -0.5, zIndex: 3 }}
        />
      )}
    </Box>
  );
}

// --- TimelineEdges ---

function TimelineEdges({
  events,
  nodeRefs,
  containerRef,
}: {
  events: EventDetail[];
  nodeRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    svg.setAttribute("width", String(container.scrollWidth));
    svg.setAttribute("height", String(container.scrollHeight));

    const paths: string[] = [];
    const containerRect = container.getBoundingClientRect();

    const evMap = new Map(events.map((e) => [e.id, e]));

    for (const ev of events) {
      for (const targetId of ev.links.outLinks) {
        const fromEl = nodeRefs.current.get(ev.id);
        const toEl = nodeRefs.current.get(targetId);
        if (!fromEl || !toEl) continue;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const target = evMap.get(targetId);

        // From: use the side facing the center line
        // IN nodes are on the left → connect from right edge
        // OUT nodes are on the right → connect from left edge
        const fromIsIn = ev.direction === "in";
        const x1 = fromIsIn
          ? fromRect.right - containerRect.left + container.scrollLeft
          : fromRect.left - containerRect.left + container.scrollLeft;
        const y1 =
          fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop;

        // To: same logic
        const toIsIn = target?.direction === "in";
        const x2 = toIsIn
          ? toRect.right - containerRect.left + container.scrollLeft
          : toRect.left - containerRect.left + container.scrollLeft;
        const y2 =
          toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop;

        const cx = (x1 + x2) / 2;
        paths.push(
          `<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}" fill="none" stroke="rgba(150,150,150,0.5)" stroke-width="1.5" stroke-dasharray="4 2"/>`,
        );
      }
    }

    svg.innerHTML = paths.join("");
  }, [events, nodeRefs, containerRef]);

  useEffect(() => {
    let rafId: number;
    function tick() {
      draw();
      rafId = requestAnimationFrame(tick);
    }
    // Initial draw after a small delay to allow layout
    rafId = requestAnimationFrame(tick);

    // Stop RAF after 1 second of continuous drawing, switch to observer-based
    const timeout = setTimeout(() => {
      cancelAnimationFrame(rafId);
      draw(); // one final draw
    }, 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeout);
    };
  }, [draw]);

  // ResizeObserver for container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    for (const el of nodeRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [draw, containerRef, nodeRefs]);

  // Redraw on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => draw();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [draw, containerRef]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    />
  );
}

// --- ExpandedTimeline ---

function ExpandedTimeline({
  events,
  allLabels,
  repoAssets,
  repoId,
  onMutate,
}: {
  events: EventDetail[];
  allLabels: LabelSummary[];
  repoAssets: AssetSummary[];
  repoId: number;
  onMutate: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Sort events by createdAt
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Sync nodeRefs map — remove stale entries
  const eventIds = new Set(events.map((e) => e.id));
  for (const key of nodeRefs.current.keys()) {
    if (!eventIds.has(key)) nodeRefs.current.delete(key);
  }

  function getNodeRef(id: number): RefObject<HTMLDivElement | null> {
    return {
      get current() {
        return nodeRefs.current.get(id) ?? null;
      },
      set current(el: HTMLDivElement | null) {
        if (el) {
          nodeRefs.current.set(id, el);
        } else {
          nodeRefs.current.delete(id);
        }
      },
    };
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <LabelsBar allLabels={allLabels} onMutate={onMutate} />
      <AssetsBar repoAssets={repoAssets} repoId={repoId} onMutate={onMutate} />
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          p: 2,
        }}
      >
        {/* Central vertical line */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: "divider",
            transform: "translateX(-50%)",
            zIndex: 0,
          }}
        />

        {/* SVG edges */}
        <TimelineEdges
          events={events}
          nodeRefs={nodeRefs}
          containerRef={containerRef}
        />

        {/* Timeline rows */}
        {sorted.map((ev) => {
          const isIn = ev.direction === "in";
          return (
            <Box
              key={ev.id}
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Left half */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end",
                  pr: 2,
                }}
              >
                {isIn && (
                  <TimelineNode
                    event={ev}
                    allEvents={events}
                    nodeRef={getNodeRef(ev.id)}
                    onMutate={onMutate}
                  />
                )}
              </Box>


              {/* Right half */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-start",
                  pl: 2,
                }}
              >
                {!isIn && (
                  <TimelineNode
                    event={ev}
                    allEvents={events}
                    nodeRef={getNodeRef(ev.id)}
                    onMutate={onMutate}
                  />
                )}
              </Box>
            </Box>
          );
        })}

        {sorted.length === 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 4 }}
          >
            No events yet
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// --- EventBlock (collapsed view) ---

function EventBlock({
  event,
  onMutate,
}: {
  event: EventDetail;
  onMutate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const isIn = event.direction === "in";

  async function commitEdit() {
    const val = editValue.trim();
    if (!val || val === event.summary) {
      setEditing(false);
      return;
    }
    await updateEvent(event.id, val);
    setEditing(false);
    onMutate();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete event "${event.summary}"?`)) return;
    await deleteEvent(event.id);
    onMutate();
  }

  return (
    <Box
      sx={{
        pl: 2,
        borderLeft: 2,
        borderColor: isIn ? "info.main" : "success.main",
      }}
    >
      <Paper
        sx={{
          px: 1.5,
          py: 1,
          mb: 1,
          cursor: "pointer",
          bgcolor: isIn ? "rgba(33,150,243,0.08)" : "rgba(76,175,80,0.08)",
          display: "flex",
          alignItems: "flex-start",
          gap: 0.5,
        }}
        onClick={() => setOpen((v) => !v)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          setEditValue(event.summary);
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <InputBase
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              fullWidth
              multiline
              sx={{ fontSize: "0.875rem", fontWeight: "bold" }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <Typography variant="body2" fontWeight="bold">
                {event.summary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {event.createdAt}
              </Typography>
            </>
          )}
        </Box>
        <IconButton
          size="small"
          title="Delete"
          onClick={handleDelete}
          sx={{ mt: -0.5 }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Paper>
      <Collapse in={open}>
        {event.assets.length > 0 ? (
          <Box display="flex" gap={0.5} flexWrap="wrap" pb={1}>
            {event.assets.map((a) => (
              <Chip key={a.id} label={a.name} size="small" variant="outlined" />
            ))}
          </Box>
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ pb: 1, display: "block" }}
          >
            No assets
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}

// --- Main Component ---

export default function EventTimeline({
  repoId,
  refreshKey,
  expanded,
  onToggleExpand,
}: {
  repoId: number | null;
  refreshKey: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newDirection, setNewDirection] = useState<"in" | "out">("in");
  const [allLabels, setAllLabels] = useState<LabelSummary[]>([]);
  const [repoAssets, setRepoAssets] = useState<AssetSummary[]>([]);

  useEffect(() => {
    if (!repoId) {
      setDetail(null);
      return;
    }
    fetchRepo(repoId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [repoId, refreshKey, localRefresh]);

  useEffect(() => {
    if (!expanded) return;
    fetchLabels().then(setAllLabels).catch(() => {});
    if (repoId) {
      fetchRepoAssets(repoId).then(setRepoAssets).catch(() => {});
    }
  }, [expanded, localRefresh, repoId]);

  function handleMutate() {
    setLocalRefresh((v) => v + 1);
  }

  async function handleCreateEvent() {
    const summary = newSummary.trim();
    if (!summary || !repoId) return;
    await createEvent(repoId, newDirection, summary);
    setNewSummary("");
    setShowNewEvent(false);
    handleMutate();
  }

  if (!repoId) return null;

  return (
    <Box
      sx={{
        flex: expanded ? 5 : 1,
        minWidth: 0,
        height: "100%",
        borderLeft: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 1 }}>
          Events
        </Typography>
        <Box display="flex" gap={0.5}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowNewEvent((v) => !v)}
          >
            New
          </Button>
          <IconButton
            size="small"
            onClick={onToggleExpand}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <CloseFullscreenIcon fontSize="small" />
            ) : (
              <OpenInFullIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* New event form */}
      <Collapse in={showNewEvent}>
        <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
          <ToggleButtonGroup
            value={newDirection}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v) setNewDirection(v);
            }}
          >
            <ToggleButton value="in">IN</ToggleButton>
            <ToggleButton value="out">OUT</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Summary"
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateEvent();
              if (e.key === "Escape") {
                setShowNewEvent(false);
                setNewSummary("");
              }
            }}
            fullWidth
            autoFocus
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleCreateEvent}
            disabled={!newSummary.trim()}
          >
            Create
          </Button>
        </Box>
      </Collapse>

      {/* Content area */}
      {detail ? (
        expanded ? (
          <ExpandedTimeline
            events={detail.events}
            allLabels={allLabels}
            repoAssets={repoAssets}
            repoId={repoId!}
            onMutate={handleMutate}
          />
        ) : (
          <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
            {detail.events.length > 0 ? (
              detail.events.map((ev) => (
                <EventBlock
                  key={ev.id}
                  event={ev}
                  onMutate={handleMutate}
                />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No events yet
              </Typography>
            )}
          </Box>
        )
      ) : (
        <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      )}
    </Box>
  );
}
