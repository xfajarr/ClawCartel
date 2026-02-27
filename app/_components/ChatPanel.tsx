"use client";

import * as React from "react";
import { PixelAvatar } from "@/app/_components/PixelAvatar";
import { Button } from "@/app/_components/ui/button";
import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { Textarea } from "@/app/_components/ui/textarea";
import { cn, getSolanaColorById, truncateId } from "@/app/_libs/utils";
import { MessageSquareIcon, Paperclip, SendIcon } from "lucide-react";

export interface ChatMessage {
  id: string;
  /** Sender id — used with getColorById() for stable color */
  senderId: string;
  senderName?: string;
  content: string;
  /** Optional: "user" for current user, others treated as other participants */
  role?: "user" | "assistant";
}

/** Dummy multi-person chat messages for development/demo */
export const DUMMY_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    senderId: "alice",
    senderName: "Alice",
    content: "Hey, did you get the design specs?",
  },
  {
    id: "2",
    senderId: "bob",
    senderName: "Bob",
    content: "Yes, just finished the review. Looks good to me.",
  },
  {
    id: "3",
    senderId: "carol",
    senderName: "Carol",
    content: "Can we ship the auth changes this week?",
  },
  {
    id: "4",
    senderId: "alice",
    senderName: "Alice",
    content: "I’d say Monday if QA is done by Friday.",
  },
  {
    id: "5",
    senderId: "dave",
    senderName: "Dave",
    content: "I’ll run the E2E suite tonight and report back.",
  },
  {
    id: "6",
    senderId: "bob",
    senderName: "Bob",
    content: "Thanks Dave. Carol — can you update the docs?",
  },
  { id: "7", senderId: "carol", senderName: "Carol", content: "On it. I’ll push a draft by EOD." },
  {
    id: "8",
    senderId: "eve",
    senderName: "Eve",
    content: "New here — where do we log deployment issues?",
  },
  {
    id: "9",
    senderId: "alice",
    senderName: "Alice",
    content: "We use #deploys in Slack. I’ll add you to the channel.",
  },
];

export interface ChatPanelProps {
  /** Optional title in header */
  title?: string;
  /** Optional placeholder when no messages */
  emptyPlaceholder?: React.ReactNode;
  /** Optional class for the root */
  className?: string;
  /** Initial messages to show */
  initialMessages?: ChatMessage[];
  /** Callback when user sends a message (optional; for wiring to API later) */
  onSend?: (message: string) => void;
}

export function ChatPanel({
  title = "Chat",
  emptyPlaceholder,
  className,
  initialMessages = [],
  onSend,
}: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: "user",
      senderName: "You",
      content: text,
      role: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    onSend?.(text);
    requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const handleFileUpload = () => {
    const file = input.trim();
    if (!file) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: "user",
      senderName: "You",
      content: file,
      role: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    onSend?.(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("bg-background flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-border/50 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquareIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
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
              <p className="mt-1 text-xs">Ask anything or describe what you’re building.</p>
            </div>
          ) : (
            messages.map((m) => {
              const { bg } = getSolanaColorById(m.senderId);
              const isUser = m.role === "user" || m.senderId === "user";
              const label = m.senderName ?? truncateId(m.senderId);
              return (
                <div
                  key={m.id}
                  className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
                >
                  <PixelAvatar
                    id={m.senderId}
                    size={36}
                    title={m.senderName ?? m.senderId}
                    className="shrink-0 ring-2 ring-background"
                  />
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl border px-3 py-2 text-sm text-foreground wrap-break-word",
                      isUser &&
                        "ml-auto border-[#14F195]/40 bg-[#14F195]/20",
                    )}
                    style={
                      isUser
                        ? undefined
                        : {
                            backgroundColor: `${bg}18`,
                            borderColor: `${bg}50`,
                          }
                    }
                  >
                    {!isUser && (
                      <div className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {label}
                      </div>
                    )}
                    <span className="text-foreground">{m.content}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-border/50 shrink-0 border-t p-2">
        <div className="relative flex gap-2">
          <Button
            type="button"
            size="icon"
            className="absolute top-3 right-3 size-9 shrink-0"
            onClick={handleSend}
            aria-label="Send"
          >
            <SendIcon className="size-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            className="absolute bottom-3 left-3 size-9 shrink-0"
            onClick={handleFileUpload}
            aria-label="Upload file"
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            placeholder="Message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-40 resize-none py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
