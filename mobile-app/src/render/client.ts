/**
 * Talks to the offline page renderer (a hidden WebView running pdf.js, see RendererHost).
 *
 * The WebView only exists while a job needs it: `withRenderer` mounts it, waits until it's
 * ready, runs the work, then unmounts it so its memory is freed. Jobs that need it take turns.
 *
 * Plain TypeScript with no React Native imports, so the engine stays testable.
 */
import { PdfError } from "@/engine/core";

type Reply =
  | { type: "ready" }
  | { type: "opened"; id: string; pages: number }
  | { type: "page"; id: string; page: number; width: number; height: number; data: string }
  | { type: "closed"; id: string }
  | { type: "error"; id: string; code: string; message: string };

export type RenderedPage = { bytes: Uint8Array; width: number; height: number };

export type RenderSession = {
  /** Opens a PDF given as base64. Resolves with its page count. */
  open: (base64: string, password?: string) => Promise<number>;
  render: (page: number, opts: { scale: number; format: "png" | "jpeg"; quality: number }) => Promise<RenderedPage>;
};

export type RendererHost = {
  setMounted: (mounted: boolean) => void;
  send: (message: string) => void;
};

const READY_TIMEOUT = 20_000;

let host: RendererHost | null = null;
let readyWaiter: { resolve: () => void; reject: (e: Error) => void } | null = null;
const pending = new Map<string, { resolve: (reply: Reply) => void; reject: (e: Error) => void }>();
let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

export function attachHost(next: RendererHost | null) {
  host = next;
}

/** Called by the host for every message the WebView posts. */
export function receive(raw: string) {
  let reply: Reply;
  try {
    reply = JSON.parse(raw) as Reply;
  } catch {
    return;
  }
  if (reply.type === "ready") {
    readyWaiter?.resolve();
    readyWaiter = null;
    return;
  }
  const waiter = pending.get(reply.id);
  if (!waiter) return;
  pending.delete(reply.id);
  waiter.resolve(reply);
}

/** Called by the host if the WebView's process dies (low memory, etc.). */
export function crashed() {
  const error = new PdfError("The page renderer stopped, probably because the phone ran low on memory. Try fewer pages or a lower resolution.");
  readyWaiter?.reject(error);
  readyWaiter = null;
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
}

function request(message: Record<string, unknown>): Promise<Reply> {
  if (!host) return Promise.reject(new PdfError("The page renderer isn't available right now."));
  const id = `r${++counter}`;
  const current = host;
  return new Promise<Reply>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    current.send(JSON.stringify({ ...message, id }));
  });
}

function failOn(reply: Reply): never {
  if (reply.type === "error" && reply.code === "password") {
    throw new PdfError("This PDF is locked with a password. Unlock it first with Unlock PDF, then try again.");
  }
  if (reply.type === "error" && reply.code === "unreadable") throw new PdfError("This PDF couldn't be read. It may be damaged.");
  throw new PdfError(reply.type === "error" ? `A page couldn't be drawn: ${reply.message}` : "The page renderer gave an unexpected answer.");
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const session: RenderSession = {
  open: async (base64, password) => {
    const reply = await request({ type: "open", data: base64, password });
    if (reply.type !== "opened") failOn(reply);
    return reply.pages;
  },
  render: async (page, opts) => {
    const reply = await request({ type: "render", page, ...opts });
    if (reply.type !== "page") failOn(reply);
    return { bytes: fromBase64(reply.data), width: reply.width, height: reply.height };
  },
};

async function mountAndWait(): Promise<void> {
  if (!host) throw new PdfError("The page renderer isn't available right now.");
  const ready = new Promise<void>((resolve, reject) => {
    readyWaiter = { resolve, reject };
    setTimeout(() => reject(new PdfError("The page renderer took too long to start. Please try again.")), READY_TIMEOUT);
  });
  host.setMounted(true);
  await ready;
}

/** Runs `work` with the renderer mounted, then frees it. Jobs wait their turn. */
export function withRenderer<T>(work: (session: RenderSession) => Promise<T>): Promise<T> {
  const run = async () => {
    try {
      await mountAndWait();
      return await work(session);
    } finally {
      host?.setMounted(false);
      readyWaiter = null;
      pending.clear();
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
