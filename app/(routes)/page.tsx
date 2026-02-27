"use client";

import { ChatPanel, DUMMY_CHAT_MESSAGES } from "@/app/_components/chats/ChatPanel";
import { IdeLayout } from "@/app/_components/IdeLayout";
import { cn } from "@/app/_libs/utils";
import Builder from "../_components/builders/Builder";

export default function IdeLayoutPage() {
  return (
    <div className="bg-background flex h-full min-h-0 w-full flex-col">
      <div className="h-full min-h-0 flex-1">
        <IdeLayout
          defaultLeftSize={380}
          defaultRightWidth={300}
          left={
            <ChatPanel
              initialMessages={DUMMY_CHAT_MESSAGES}
              emptyPlaceholder={
                <>
                  <p>Start a conversation</p>
                  <p className="mt-1 text-xs">Ask anything or describe what you’re building.</p>
                </>
              }
            />
          }
          right={<Builder />}
          centerClassName="p-6"
        >
          <div className={cn("border-border/50 bg-card rounded-lg border p-6 shadow-sm")}>
            <h1 className="mb-2 text-xl font-semibold">IDE-style layout</h1>
            <p className="text-muted-foreground">
              Center is full width; right panel overlays on top. Drag the right edge to resize.
            </p>
          </div>
        </IdeLayout>
      </div>
    </div>
  );
}
