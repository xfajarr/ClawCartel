"use client";

import * as React from "react";
import { PixelAvatar } from "@/app/_components/PixelAvatar";
import { Button } from "@/app/_components/ui/button";
import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { Textarea } from "@/app/_components/ui/textarea";
import { useChat } from "@/app/_providers/ChatProvider";
import { useSolana } from "@/app/_providers/SolanaProvider";
import { cn, getSolanaColorById } from "@/app/_libs/utils";
import {
  BotIcon,
  CheckIcon,
  DownloadIcon,
  MessageSquareIcon,
  SendIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover";
import { AgentDialog } from "@/app/_components/agents/AgentDialog";
import { AGENTS, getAgentById } from "@/app/_data/agents";
import type { Agent } from "@/app/_data/agents";

export interface ChatPanelProps {
  emptyPlaceholder?: React.ReactNode;
  className?: string;
  agentsPanelOpen?: boolean;
  onAgentsPanelOpenChange?: (open: boolean) => void;
  agentForDialog?: Agent | null;
  onAgentDialogChange?: (agent: Agent | null) => void;
  agentIds?: string[];
}

const DEFAULT_AGENT_IDS = ["adam", "alex", "amelia", "bob"];

const AVATAR_HOVER =
  "group inline-flex shrink-0 rounded-full p-0.5 ring-2 ring-transparent transition-transform hover:scale-[1.06] hover:ring-primary focus-visible:scale-[1.06] focus-visible:ring-primary focus-visible:outline-none";

function TypingDots() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5">
      <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
      <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

function AgentsPopoverContent({
  onSelectAgent,
  onClose,
}: {
  onSelectAgent: (agent: Agent) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-muted-foreground text-xs">Click an avatar to read about that agent.</p>
      <div className="flex flex-wrap gap-3">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => {
              onSelectAgent(agent);
              onClose();
            }}
            className={AVATAR_HOVER}
            aria-label={`About ${agent.name}`}
          >
            <PixelAvatar id={agent.id} size={40} title={agent.name} className="" />
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

export function ChatPanel({
  emptyPlaceholder,
  className,
  agentsPanelOpen,
  onAgentsPanelOpenChange,
  agentForDialog: agentForDialogProp,
  onAgentDialogChange,
  agentIds = DEFAULT_AGENT_IDS,
}: ChatPanelProps) {
  const { isConnected: isWalletConnected, setOpen: setWalletOpen } = useSolana();
  const {
    step,
    messages,
    loading,
    error,
    phase,
    approvalData,
    fileCount,
    startDiscussion,
    sendUserMessage,
    continueToDevelopment,
    downloadProject,
  } = useChat();

  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [internalAgentsOpen, setInternalAgentsOpen] = React.useState(false);
  const agentsOpen = agentsPanelOpen ?? internalAgentsOpen;
  const setAgentsOpen = onAgentsPanelOpenChange ?? setInternalAgentsOpen;
  const [internalAgentForDialog, setInternalAgentForDialog] = React.useState<Agent | null>(null);
  const agentForDialog = agentForDialogProp ?? internalAgentForDialog;
  const setAgentForDialog = onAgentDialogChange ?? setInternalAgentForDialog;

  const scrollToBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }));

  const handleSend = () => {
    if (!isWalletConnected) return;
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    if (step === "idle") {
      startDiscussion(text);
    } else if (step === "chat") {
      sendUserMessage(text);
    }
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isWalletConnected) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAgentId = (id: string) => agentIds.includes(id.toLowerCase());

  const showInput = isWalletConnected && step !== "approval" && step !== "complete";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-border/50 flex items-center justify-between border-b px-3 py-2 pr-10">
        <div className="flex items-center gap-2">
          <span className="font-geist-semi-bold text-xs font-bold">Chat</span>
          {phase && step === "chat" && (
            <span className="text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 font-mono text-[10px]">
              {phase}
            </span>
          )}
        </div>
        <Popover open={agentsOpen} onOpenChange={setAgentsOpen}>
          <PopoverTrigger
            className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs"
            aria-label="View agents"
          >
            <BotIcon className="size-3.5" />
            Agents
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0" side="bottom">
            <AgentsPopoverContent
              onSelectAgent={(agent) => setAgentForDialog(agent)}
              onClose={() => setAgentsOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && emptyPlaceholder != null ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-8 text-center text-sm">
              {emptyPlaceholder}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-8 text-center text-sm">
              <MessageSquareIcon className="mb-2 size-8 opacity-50" />
              <p>Start a conversation</p>
              <p className="mt-1 text-xs">Describe your project idea to kick off the discussion.</p>
            </div>
          ) : (
            messages.map((m) => {
              if (m.type === "round-marker") {
                return (
                  <div key={m.id} className="flex items-center gap-2 py-1">
                    <div className="border-border/50 flex-1 border-t" />
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px] font-medium tracking-wider uppercase">
                      {m.content}
                    </span>
                    <div className="border-border/50 flex-1 border-t" />
                  </div>
                );
              }

              if (m.type === "file-created") {
                return (
                  <div
                    key={m.id}
                    className="border-border/50 text-muted-foreground bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <span>📄</span>
                    <span className="font-mono">{m.content}</span>
                  </div>
                );
              }

              const isUser = m.type === "user";
              const agentId = m.agentName?.toLowerCase() ?? "agent";
              const { bg } = getSolanaColorById(isUser ? "user" : agentId);
              const label = isUser ? "You" : (m.agentName ?? "Agent");
              const avatar = (
                <PixelAvatar
                  id={isUser ? "user" : agentId}
                  size={36}
                  title={label}
                  className="shrink-0"
                />
              );

              return (
                <div
                  key={m.id}
                  className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
                >
                  {!isUser && isAgentId(agentId) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const agent = getAgentById(agentId);
                        if (agent) setAgentForDialog(agent);
                      }}
                      className={AVATAR_HOVER}
                      aria-label={`About ${label}`}
                    >
                      {avatar}
                    </button>
                  ) : (
                    avatar
                  )}
                  <div
                    className={cn(
                      "text-foreground max-w-[85%] rounded-xl border px-3 py-2 text-sm wrap-break-word",
                      isUser && "ml-auto border-[#14F195]/40 bg-[#14F195]/20",
                      !isUser && !m.isDone && "opacity-80",
                    )}
                    style={
                      isUser ? undefined : { backgroundColor: `${bg}18`, borderColor: `${bg}50` }
                    }
                  >
                    {!isUser && (
                      <div className="mb-0.5 flex items-center gap-1.5">
                        {m.agentEmoji && <span className="text-xs">{m.agentEmoji}</span>}
                        <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wider uppercase">
                          {label}
                        </span>
                        {m.isDone && (
                          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-green-500">
                            <CheckIcon className="size-2.5" /> Done
                          </span>
                        )}
                        {!m.isDone && !m.content && <TypingDots />}
                      </div>
                    )}
                    {m.content ? (
                      <span className="text-foreground">{m.content}</span>
                    ) : (
                      !m.isDone &&
                      !isUser && (
                        <span className="text-muted-foreground text-xs italic">Thinking…</span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Approval banner */}
      {step === "approval" && approvalData && (
        <div className="border-border/50 bg-muted/30 border-t p-3">
          <p className="text-foreground mb-1 text-xs font-medium">{approvalData.message}</p>
          <p className="text-muted-foreground mb-3 text-[11px]">
            The squad has agreed on the approach. Ready to generate code?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => continueToDevelopment(true)}
              disabled={loading}
            >
              <CheckIcon className="mr-1.5 size-3.5" />
              Approve &amp; Build
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => continueToDevelopment(false)}
              disabled={loading}
            >
              <XIcon className="mr-1.5 size-3.5" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Completion banner */}
      {step === "complete" && (
        <div className="border-border/50 bg-muted/30 border-t p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground text-xs font-medium">
              ✅ Done — {fileCount} file{fileCount !== 1 ? "s" : ""} created
            </p>
            <Button size="sm" variant="outline" onClick={downloadProject}>
              <DownloadIcon className="mr-1.5 size-3.5" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-border/50 shrink-0 border-t p-2">
        {!isWalletConnected ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-6 text-center text-sm">
            <WalletIcon className="size-8 opacity-50" />
            <p>Connect your wallet to chat</p>
            <Button variant="secondary" size="sm" onClick={() => setWalletOpen(true)}>
              <WalletIcon className="mr-2 size-4" />
              Connect Wallet
            </Button>
          </div>
        ) : showInput ? (
          <div className="relative flex gap-2">
            <Button
              type="button"
              size="icon"
              className="absolute top-3 right-3 size-9 shrink-0"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label={step === "idle" ? "Start discussion" : "Send"}
            >
              <SendIcon className="size-4" />
            </Button>
            <Textarea
              placeholder={step === "idle" ? "Describe your project idea…" : "Message…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-40 resize-none py-2 pr-14 text-sm"
              disabled={loading}
            />
          </div>
        ) : null}
      </div>

      <AgentDialog
        open={!!agentForDialog}
        onOpenChange={(open) => !open && setAgentForDialog(null)}
        agent={agentForDialog}
      />
    </div>
  );
}
