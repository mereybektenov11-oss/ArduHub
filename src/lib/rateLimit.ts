export function createRateLimiter(limit = 5, windowMs = 60_000) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return {
    check(key: string, now = Date.now()) {
      for (const [ip, bucket] of buckets)
        if (bucket.expires <= now) buckets.delete(ip);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { count: 0, expires: now + windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= limit) return false;
      bucket.count++;
      return true;
    },
    clear() {
      buckets.clear();
    },
  };
}
export const waitlistLimiter = createRateLimiter();
