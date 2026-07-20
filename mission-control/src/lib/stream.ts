import type { BridgeEvent } from "./types";

/** Encode a bridge event as one NDJSON line. */
export function encodeEvent(event: BridgeEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

/**
 * Wrap a line-oriented producer into a web ReadableStream of NDJSON
 * BridgeEvents. The producer receives an `emit` callback and must resolve
 * when the underlying process/request has finished.
 */
export function bridgeStream(
  run: (emit: (e: BridgeEvent) => void, signal: AbortSignal) => Promise<void>,
): Response {
  const abort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: BridgeEvent) => {
        try {
          controller.enqueue(encodeEvent(e));
        } catch {
          // client went away; stop the producer
          abort.abort();
        }
      };
      try {
        await run(emit, abort.signal);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      }
      emit({ type: "done" });
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
