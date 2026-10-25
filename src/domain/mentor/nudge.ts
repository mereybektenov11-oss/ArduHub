export type NudgeOptions = {
  stageKey: string;
  active: boolean;
  enabled: boolean;
};

/** Timer policy is independent of React so stage changes and races are testable. */
export function createMentorNudge(shown = new Set<string>()) {
  let options: NudgeOptions = { stageKey: "", active: false, enabled: true };
  const listeners = new Set<() => void>();
  let visible = false;
  let failures = 0;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let failed: ReturnType<typeof setTimeout> | undefined;
  const emit = () => listeners.forEach((listener) => listener());
  const eligible = () =>
    options.active && options.enabled && !shown.has(options.stageKey);
  function clear() {
    clearTimeout(idle);
    clearTimeout(failed);
  }
  function show() {
    if (!eligible()) return;
    clear();
    shown.add(options.stageKey);
    visible = true;
    emit();
  }
  function recordActivity() {
    clearTimeout(idle);
    if (eligible()) idle = setTimeout(show, 180_000);
  }
  return {
    configure(next: NudgeOptions) {
      if (
        next.stageKey === options.stageKey &&
        next.active === options.active &&
        next.enabled === options.enabled
      ) {
        recordActivity();
        return;
      }
      clear();
      failures = 0;
      visible = false;
      options = next;
      emit();
      recordActivity();
    },
    recordActivity,
    recordCheck(passed: boolean) {
      if (!eligible()) return;
      recordActivity();
      failures = passed ? 0 : failures + 1;
      if (passed) clearTimeout(failed);
      else if (failures === 2) failed = setTimeout(show, 1_000);
    },
    dismiss() {
      visible = false;
      emit();
    },
    getSnapshot: () => visible,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: clear,
  };
}
