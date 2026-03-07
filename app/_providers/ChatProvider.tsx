"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { APP_CONFIG } from "../_configs/app";
import { disconnectSocket, getSocket } from "../_libs/socket/socket";
import {
  AgentMessage,
  AgentMessageType,
  ApprovalData,
  FileNode,
  RunStats,
  RunStep,
} from "../_types/chat";
import { ChatService } from "../_services/chat";
import { useMutation } from "@tanstack/react-query";
import { PHASE_LABELS } from "../_constant/chat";
import { useAgents } from "./AgentsProvider";

interface SocketAgentPayload {
  id?: number;
  name?: string;
  role?: string;
}

const CODEGEN_DEBOUNCE_MS = 200;

interface ChatContextType {
  step: RunStep;
  messages: AgentMessage[];
  isConnected: boolean;
  error: string | null;
  loading: boolean;
  phase: string | null;
  runId: string | null;
  approvalData: ApprovalData | null;
  files: FileNode[];
  stats: RunStats | null;
  fileCount: number;
  messageCount: number;
  /** Last accumulated message per agent name, for map bubble chat */
  agentBubbles: Record<string, string>;
  /** Pending codegen writes: file path → full accumulated content (for Builder to apply) */
  codegenPendingWrites: Record<string, string>;
  ackCodegenWrite: (path: string) => void;
  startDiscussion: (idea: string) => Promise<void>;
  sendUserMessage: (content: string) => string;
  removeMessage: (id: string) => void;
  continueToDevelopment: (approved: boolean) => Promise<void>;
  refreshFiles: () => Promise<void>;
  downloadProject: () => void;
  resetThread: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { agents } = useAgents();
  const [step, setStep] = useState<RunStep>(RunStep.IDLE);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [agentBubbles, setAgentBubbles] = useState<Record<string, string>>({});
  const [codegenPendingWrites, setCodegenPendingWrites] = useState<Record<string, string>>({});

  // Refs for mutable values used inside callbacks without triggering re-renders
  const runIdRef = useRef<string | null>(null);
  const activeMessagesRef = useRef<Record<string, string>>({});
  const codegenBuffersRef = useRef<Record<string, string>>({});
  const codegenDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fileCreatedIdRef = useRef(0);

  const mutateGetRunsId = useMutation({
    mutationFn: ChatService.getRunsId,
  });

  const mutateContinueToDevelopment = useMutation({
    mutationFn: ChatService.continueToDevelopment,
  });

  const mutateGetFilesProject = useMutation({
    mutationFn: ChatService.getFilesProject,
  });

  const mutateStartNewThread = useMutation({
    mutationFn: ChatService.startNewThread,
  });

  const refreshFiles = useCallback(async () => {
    if (!runIdRef.current) return;
    try {
      const response = await mutateGetFilesProject.mutateAsync(runIdRef.current);
      setFiles(response.data?.files ?? []);
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  }, [mutateGetFilesProject]);

  // Stored in a ref so handleEvent can always call the latest version
  const refreshFilesRef = useRef(refreshFiles);

  useEffect(() => {
    refreshFilesRef.current = refreshFiles;
  }, [refreshFiles]);

  const handleEvent = useCallback(
    (event: {
      eventType: string;
      payload: Record<string, unknown>;
      agent?: SocketAgentPayload;
    }) => {
      const { eventType, payload } = event;
      const topLevelAgent = event.agent;
      const agentName =
        (topLevelAgent?.name as string | undefined) ?? (payload.agentName as string | undefined);
      const agentId = topLevelAgent?.id;
      const agentRole = topLevelAgent?.role as string | undefined;
      const resolvedName =
        (typeof agentName === "string" ? agentName : null) ||
        (typeof agentId !== "undefined"
          ? agents.find((a) => a.id === `agent-${agentId}`)?.name
          : null);
      const bubbleKey = resolvedName ?? `agent-${agentId ?? ""}`;

      if (payload.phase && typeof payload.phase === "string") {
        setPhase(PHASE_LABELS[payload.phase] ?? payload.phase.toUpperCase());
      }

      switch (eventType) {
        case "agent.started": {
          const phase = payload.phase as string | undefined;
          const isRoundMarker =
            phase?.startsWith("round") ||
            phase === "final" ||
            phase?.startsWith("phase") ||
            phase === "code_generation";

          if (isRoundMarker) {
            setMessages((prev) => [
              ...prev,
              {
                id: `marker-${Date.now()}`,
                type: AgentMessageType.ROUND_MARKER,
                content: (payload.message as string) || phase || "",
                phase,
              },
            ]);
          } else {
            setLoading(false);
            const id = `msg-${bubbleKey}-${Date.now()}`;
            activeMessagesRef.current[bubbleKey] = id;
            setMessages((prev) => [
              ...prev,
              {
                id,
                type: AgentMessageType.AGENT,
                content: "",
                agentName: bubbleKey,
                agentEmoji: payload.agentEmoji as string | undefined,
                agentId,
                agentRole,
                isDone: false,
                phase,
              },
            ]);
          }
          break;
        }

        case "agent.delta": {
          const phase = payload.phase as string | undefined;

          if (phase === "file_created") {
            setFileCount((c) => c + 1);
            fileCreatedIdRef.current += 1;
            setMessages((prev) => [
              ...prev,
              {
                id: `file-${fileCreatedIdRef.current}`,
                type: AgentMessageType.FILE_CREATED,
                content: payload.message as string,
              },
            ]);
            break;
          }

          if (phase?.startsWith("round") || phase === "final") break;

          const accumulated = payload.accumulated as string | undefined;
          if (typeof accumulated === "string" && bubbleKey) {
            setAgentBubbles((prev) => ({ ...prev, [bubbleKey]: accumulated }));
          }

          const deltaTargetId = activeMessagesRef.current[bubbleKey];
          if (deltaTargetId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === deltaTargetId
                  ? {
                      ...m,
                      content: accumulated ?? (payload.message as string) ?? m.content,
                    }
                  : m,
              ),
            );
          }
          break;
        }

        case "agent.done": {
          const phase = payload.phase as string | undefined;
          if (phase?.startsWith("round") || phase === "final") break;

          const doneTargetId = activeMessagesRef.current[bubbleKey];
          if (doneTargetId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === doneTargetId
                  ? { ...m, content: payload.message as string, isDone: true }
                  : m,
              ),
            );
            setMessageCount((c) => c + 1);
            delete activeMessagesRef.current[bubbleKey];
          }
          setLoading(false);
          break;
        }

        case "run.done": {
          const phase = payload.phase as string;
          setLoading(false);
          if (phase === "awaiting_approval") {
            setApprovalData({
              message: payload.message as string,
              discussionSummary: payload.discussionSummary as unknown[],
            });
            setStep(RunStep.APPROVAL);
          } else if (phase === "completed") {
            setStats((payload.stats as RunStats) ?? null);
            setStep(RunStep.COMPLETE);
            setPhase(null);
            setAgentBubbles({});
            refreshFilesRef.current();
          } else if (phase === "rejected") {
            setStep(RunStep.IDLE);
            setAgentBubbles({});
          }
          break;
        }
      }
    },
    [agents],
  );

  const ackCodegenWrite = useCallback((path: string) => {
    setCodegenPendingWrites((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const handleCodegenEvent = useCallback(
    (raw: { eventType: string; payload: Record<string, unknown> }) => {
      const { eventType, payload } = raw;
      switch (eventType) {
        case "codegen.started": {
          const filePath = payload.filePath as string | undefined;
          if (typeof filePath === "string") {
            const existing = codegenDebounceRef.current[filePath];
            if (existing) clearTimeout(existing);
            delete codegenDebounceRef.current[filePath];
            codegenBuffersRef.current[filePath] = "";
          }
          break;
        }
        case "codegen.delta": {
          const filePath = payload.filePath as string | undefined;
          const chunk = payload.chunk as string | undefined;
          if (typeof filePath !== "string" || typeof chunk !== "string") break;
          if (!codegenBuffersRef.current[filePath]) {
            codegenBuffersRef.current[filePath] = "";
          }
          codegenBuffersRef.current[filePath] += chunk;
          const existing = codegenDebounceRef.current[filePath];
          if (existing) clearTimeout(existing);
          codegenDebounceRef.current[filePath] = setTimeout(() => {
            delete codegenDebounceRef.current[filePath];
            const content = codegenBuffersRef.current[filePath];
            if (content !== undefined) {
              setCodegenPendingWrites((prev) => ({ ...prev, [filePath]: content }));
            }
          }, CODEGEN_DEBOUNCE_MS);
          break;
        }
        case "codegen.done": {
          const filePath = payload.filePath as string | undefined;
          if (typeof filePath === "string") {
            const existing = codegenDebounceRef.current[filePath];
            if (existing) clearTimeout(existing);
            delete codegenDebounceRef.current[filePath];
            const content = codegenBuffersRef.current[filePath];
            if (content !== undefined) {
              setCodegenPendingWrites((prev) => ({ ...prev, [filePath]: content }));
            }
            delete codegenBuffersRef.current[filePath];
          }
          break;
        }
        case "codegen.error": {
          const message =
            (payload.message as string) ?? (payload.error as string) ?? "Code generation failed";
          setError(typeof message === "string" ? message : "Code generation failed");
          break;
        }
      }
    },
    [],
  );

  const connectWebSocket = useCallback(
    (id: string) => {
      const socket = getSocket();

      socket.off("agent_event");
      socket.off("codegen_event");
      socket.off("disconnect");

      socket.on("disconnect", () => {
        setIsConnected(false);
      });

      socket.on("agent_event", (raw) => {
        handleEvent(raw);
      });

      socket.on("codegen_event", (raw) => {
        handleCodegenEvent(raw);
      });

      const joinRun = () => {
        setIsConnected(true);
        socket.emit("join_run", { runId: id });
      };

      // If the socket is already connected the "connect" event will never fire,
      // so emit join_run immediately; otherwise wait for the connection.
      if (socket.connected) {
        joinRun();
      } else {
        socket.once("connect", () => {
          joinRun();
        });
      }

      socket.once("connect_error", (err) => {
        console.error("[socket] connect_error", err.message, err);
      });
    },
    [handleEvent, handleCodegenEvent],
  );

  const startDiscussion = useCallback(
    async (idea: string) => {
      const trimmed = idea.trim();
      if (!trimmed) return;

      setError(null);
      setAgentBubbles({});
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          type: AgentMessageType.USER,
          content: trimmed,
        },
      ]);
      setLoading(true);

      try {
        const response = await mutateGetRunsId.mutateAsync({ idea: trimmed, mode: "squad" });
        if (!response.data?.id) throw new Error(response.message ?? "Failed to start discussion");
        runIdRef.current = response.data?.id;
        setRunId(response.data?.id);
        setStep(RunStep.CHAT);
        connectWebSocket(response.data?.id);
        // Keep loading true until first agent message arrives via socket (agent.started)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start discussion");
        setLoading(false);
      }
    },
    [connectWebSocket, mutateGetRunsId],
  );

  const sendUserMessage = useCallback((content: string): string => {
    const id = `user-${Date.now()}`;
    if (!content.trim()) return id;
    setLoading(true);
    setMessages((prev) => [...prev, { id, type: AgentMessageType.USER, content: content.trim() }]);
    return id;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const continueToDevelopment = useCallback(
    async (approved: boolean) => {
      if (!runIdRef.current) return;
      setError(null);
      setApprovalData(null);
      if (approved) {
        setStep(RunStep.CHAT);
        setMessages((prev) => [
          ...prev,
          {
            id: `marker-${Date.now()}`,
            type: AgentMessageType.ROUND_MARKER,
            content: "🚀 Starting Code Generation...",
          },
        ]);
      } else {
        setStep(RunStep.IDLE);
      }
      setLoading(true);
      try {
        const response = await mutateContinueToDevelopment.mutateAsync({
          runId: runIdRef.current,
          approved,
        });
        if (!response.data?.success) throw new Error(response.message ?? "Failed to continue");
        if (!approved) {
          setStep(RunStep.IDLE);
          setLoading(false);
        }
        // When approved, keep loading true until first agent message arrives via socket (agent.started)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to continue");
        setLoading(false);
        if (approved) setStep(RunStep.APPROVAL);
      }
    },
    [mutateContinueToDevelopment],
  );

  const downloadProject = useCallback(() => {
    if (!runIdRef.current) return;
    window.open(`${APP_CONFIG.api_url}/autonomous/runs/${runIdRef.current}/download`, "_blank");
  }, []);

  const resetThread = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await mutateStartNewThread.mutateAsync({
        idea: " ",
        mode: "squad",
      });
      if (!response.data?.id) throw new Error(response.message ?? "Failed to start new thread");
      runIdRef.current = response.data.id;
      setRunId(response.data.id);
      setMessages([]);
      setStep(RunStep.CHAT);
      setApprovalData(null);
      setPhase(null);
      setAgentBubbles({});
      setCodegenPendingWrites({});
      setStats(null);
      setFileCount(0);
      setMessageCount(0);
      connectWebSocket(response.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset thread");
    } finally {
      setLoading(false);
    }
  }, [connectWebSocket, mutateStartNewThread]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const value = useMemo(
    () => ({
      step,
      messages,
      isConnected,
      error,
      loading,
      phase,
      runId,
      approvalData,
      files,
      stats,
      fileCount,
      messageCount,
      agentBubbles,
      codegenPendingWrites,
      ackCodegenWrite,
      startDiscussion,
      sendUserMessage,
      removeMessage,
      continueToDevelopment,
      refreshFiles,
      downloadProject,
      resetThread,
    }),
    [
      step,
      messages,
      isConnected,
      error,
      loading,
      phase,
      runId,
      approvalData,
      files,
      stats,
      fileCount,
      messageCount,
      agentBubbles,
      codegenPendingWrites,
      ackCodegenWrite,
      startDiscussion,
      sendUserMessage,
      removeMessage,
      continueToDevelopment,
      refreshFiles,
      downloadProject,
      resetThread,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
