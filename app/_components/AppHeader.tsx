"use client";

import { WalletConnectButton } from "@/app/_components/WalletConnectButton";
import { cn } from "@/app/_libs/utils";

export function AppHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 flex h-10 shrink-0 items-center justify-between border-b px-4 backdrop-blur",
        className,
      )}
    >
      <h1 className="text-base font-bold">Claw Cartel</h1>
      <WalletConnectButton />
    </header>
  );
}
