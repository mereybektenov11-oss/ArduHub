import { afterEach, expect, test, vi } from "vitest";
import { supabaseFetch } from "../../src/lib/supabase/fetch";

afterEach(() => vi.unstubAllGlobals());

test("auth and data requests carry a deadline even without caller cancellation", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  const request = vi.fn().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", request);
  await supabaseFetch("https://example.com");
  expect(timeout).toHaveBeenCalledWith(8000);
  expect(request.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  timeout.mockRestore();
});

test("caller cancellation is preserved", async () => {
  const controller = new AbortController();
  const request = vi.fn().mockImplementation((_input, init) => {
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason));
    });
  });
  vi.stubGlobal("fetch", request);
  const pending = supabaseFetch("https://example.com", {
    signal: controller.signal,
  });
  controller.abort();
  await expect(pending).rejects.toHaveProperty("name", "AbortError");
});

test("a stalled request is aborted at the deadline", async () => {
  const controller = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(controller.signal);
  vi.stubGlobal(
    "fetch",
    (_input: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal!.addEventListener("abort", () =>
          reject(init.signal!.reason),
        );
      }),
  );
  const pending = supabaseFetch("https://example.com");
  controller.abort(new DOMException("Timed out", "TimeoutError"));
  await expect(pending).rejects.toHaveProperty("name", "TimeoutError");
  timeout.mockRestore();
});
