import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return Math.abs(h);
}

const PIXEL_CHARACTERS: number[][][] = [
  [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
  ],
  [
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

export function getPixelGridById(id: string): number[][] {
  const index = hashString(String(id)) % PIXEL_CHARACTERS.length;
  return PIXEL_CHARACTERS[index].map((row) => [...row]);
}

/** Palette: [bg hex, text hex] — readable on light/dark */
const COLOR_PALETTE: [string, string][] = [
  ["#dbeafe", "#1e40af"], // blue
  ["#d1fae5", "#065f46"], // emerald
  ["#fce7f3", "#9d174d"], // pink
  ["#e0e7ff", "#3730a3"], // indigo
  ["#fef3c7", "#92400e"], // amber
  ["#cffafe", "#0e7490"], // cyan
  ["#ede9fe", "#5b21b6"], // violet
  ["#ffedd5", "#c2410c"], // orange
  ["#dcfce7", "#166534"], // green
  ["#fae8ff", "#86198f"], // fuchsia
];

export function getColorById(id: string): { bg: string; text: string } {
  const index = hashString(String(id)) % COLOR_PALETTE.length;
  const [bg, text] = COLOR_PALETTE[index];
  return { bg, text };
}

/** Solana-themed palette: purple range + green accent, works on dark */
const SOLANA_PALETTE: [string, string][] = [
  ["#9945FF", "#E8D5FF"], // Solana purple
  ["#14F195", "#0D2818"], // Solana green
  ["#00D4AA", "#002E24"], // teal
  ["#7C3AED", "#EDE9FE"], // violet
  ["#06B6D4", "#083344"], // cyan
  ["#A855F7", "#F3E8FF"], // fuchsia
  ["#6366F1", "#E0E7FF"], // indigo
  ["#0EA5E9", "#0C4A6E"], // sky
  ["#8B5CF6", "#2E1065"], // purple
  ["#22D3EE", "#164E63"], // cyan-400
];

/**
 * Solana-themed stable color for an id (wallet, user). Purple/green/teal range.
 */
export function getSolanaColorById(id: string): { bg: string; text: string } {
  const index = hashString(String(id)) % SOLANA_PALETTE.length;
  const [bg, text] = SOLANA_PALETTE[index];
  return { bg, text };
}

/** Format wallet-like id for display: first 4 ... last 4 */
export function truncateId(id: string, start = 4, end = 4): string {
  const s = String(id);
  if (s.length <= start + end) return s;
  return `${s.slice(0, start)}…${s.slice(-end)}`;
}
