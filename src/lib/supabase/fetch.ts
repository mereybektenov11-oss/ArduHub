// Bound network waits for auth and data, preserving a caller's cancellation.
export const SUPABASE_REQUEST_TIMEOUT_MS = 8000;

export const supabaseFetch: typeof fetch = (input, init) => {
  const caller =
    init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const deadline = AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS);
  const signal = caller ? AbortSignal.any([caller, deadline]) : deadline;
  return fetch(input, { ...init, signal });
};
