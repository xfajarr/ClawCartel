"use client";

import Image from "next/image";
import { cn } from "@/app/_libs/utils";

export interface PixelatedLoadingScreenProps {
  message?: string;
  className?: string;
  scanline?: boolean;
}

export function PixelatedLoadingScreen({ className = "" }: PixelatedLoadingScreenProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center bg-background",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Image
        src="/images/img-claw.png"
        alt="Loading"
        width={120}
        height={120}
        className="animate-loading-claw object-contain"
        priority
        unoptimized
      />
    </div>
  );
}
