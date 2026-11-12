import { describe, expect, it, vi } from "vitest";
import { createOverlayQueue } from "../../src/components/overlay/useOverlayQueue";
describe("H overlay queue", () => {
  it("keeps the first modal active and advances only after it leaves", () => {
    const queue = createOverlayQueue(),
      changed = vi.fn();
    const unsubscribe = queue.subscribe(changed);
    queue.enter("lesson");
    queue.enter("streak");
    queue.enter("lesson");
    expect(queue.current()).toBe("lesson");
    expect(changed).toHaveBeenCalledTimes(2);
    queue.leave("missing");
    expect(changed).toHaveBeenCalledTimes(2);
    queue.leave("lesson");
    expect(queue.current()).toBe("streak");
    unsubscribe();
    queue.leave("streak");
    expect(queue.current()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(3);
  });
  it("removes a waiting modal without dismissing the active modal", () => {
    const queue = createOverlayQueue();
    queue.enter("lesson");
    queue.enter("purchase");
    queue.leave("purchase");
    expect(queue.current()).toBe("lesson");
    queue.leave("lesson");
    expect(queue.current()).toBeNull();
  });
});
