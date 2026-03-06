"use client";

import type { WebContainer } from "@webcontainer/api";
import { defaultProject } from "./defaultProject";

export type WebContainerStatus = "idle" | "booting" | "installing" | "starting" | "ready" | "error";

let instance: WebContainer | null = null;
let devProcess: { kill?: (signal?: string) => void } | null = null;
let previewUrl: string | null = null;
let status: WebContainerStatus = "idle";
let statusListener: ((s: WebContainerStatus) => void) | null = null;
let terminalOutput = "";
let terminalListener: ((output: string) => void) | null = null;
let pendingOnServerReady: ((url: string) => void) | null = null;
let bootInProgress = false;

function setStatus(s: WebContainerStatus) {
  status = s;
  statusListener?.(s);
}

function appendTerminal(chunk: string) {
  terminalOutput += chunk;
  terminalListener?.(terminalOutput);
}

async function pipeProcessOutput(process: { output: ReadableStream<string> }): Promise<void> {
  const reader = process.output.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      appendTerminal(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function getStatus(): WebContainerStatus {
  return status;
}

export function getPreviewUrl(): string | null {
  return previewUrl;
}

export function getTerminalOutput(): string {
  return terminalOutput;
}

export function setStatusListener(fn: ((s: WebContainerStatus) => void) | null) {
  statusListener = fn;
}

export function setTerminalListener(fn: ((output: string) => void) | null) {
  terminalListener = fn;
  if (fn && terminalOutput) fn(terminalOutput);
}

/**
 * Restart the dev server so the preview reflects the current code (no teardown, files stay as-is).
 * Use for manual "Rebuild" when the preview is stale.
 */
export async function rebuild(): Promise<void> {
  if (!instance || status !== "ready") {
    throw new Error("Container not ready. Start the environment first.");
  }

  if (devProcess?.kill) {
    try {
      devProcess.kill("SIGTERM");
    } catch {
      // ignore
    }
    devProcess = null;
  }

  setStatus("starting");
  appendTerminal("\n\n--- Rebuild ---\n\n");
  terminalListener?.(terminalOutput);

  const process = await instance.spawn("npm", ["run", "dev"]);
  devProcess = process;
  void pipeProcessOutput(process);
  // server-ready will fire from the listener registered in init()
}

export async function init(onServerReady: (url: string) => void): Promise<void> {
  if (instance !== null) {
    if (status === "ready" && previewUrl) {
      onServerReady(previewUrl);
    } else if (status === "booting" || status === "starting" || status === "installing") {
      pendingOnServerReady = onServerReady;
    }
    return;
  }
  if (bootInProgress) {
    pendingOnServerReady = onServerReady;
    return;
  }
  bootInProgress = true;

  try {
    const { WebContainer } = await import("@webcontainer/api");

    setStatus("booting");
    instance = await WebContainer.boot();

    setStatus("installing");
    await instance.mount(defaultProject);

    const installProcess = await instance.spawn("npm", ["install"]);
    void pipeProcessOutput(installProcess);
    const installExitCode = await installProcess.exit;
    if (installExitCode !== 0) {
      setStatus("error");
      throw new Error("npm install failed");
    }

    setStatus("starting");
    instance.on("server-ready", (_, url) => {
      previewUrl = url;
      setStatus("ready");
      onServerReady(url);
      if (pendingOnServerReady) {
        pendingOnServerReady(url);
        pendingOnServerReady = null;
      }
    });

    instance.on("error", (err) => {
      console.error("[WebContainer]", err);
      setStatus("error");
    });

    const process = await instance.spawn("npm", ["run", "dev"]);
    devProcess = process;
    void pipeProcessOutput(process);
  } catch (err) {
    instance = null;
    bootInProgress = false;
    throw err;
  }
}

export async function writeFile(path: string, contents: string): Promise<void> {
  if (!instance) {
    throw new Error("WebContainer not booted. Call init() first.");
  }
  await instance.fs.writeFile(path, contents);
}

/**
 * Create parent directories for a file path so that writeFile won't get ENOENT.
 * Uses mkdir(..., { recursive: true }).
 */
export async function ensureParentDirs(filePath: string): Promise<void> {
  if (!instance) {
    throw new Error("WebContainer not booted. Call init() first.");
  }
  const normalized = filePath.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return;
  const dir = parts.slice(0, -1).join("/");
  await instance.fs.mkdir(dir, { recursive: true });
}

export type DirEntry = { name: string; isDirectory: boolean };

export async function readDir(path: string): Promise<DirEntry[]> {
  if (!instance) {
    throw new Error("WebContainer not booted. Call init() first.");
  }
  const dir = path === "" ? "." : path;
  const entries = await instance.fs.readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    isDirectory: e.isDirectory(),
  }));
}

export async function readFile(path: string): Promise<string> {
  if (!instance) {
    throw new Error("WebContainer not booted. Call init() first.");
  }
  return instance.fs.readFile(path, "utf-8");
}
