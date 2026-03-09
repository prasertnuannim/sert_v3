export type RateLimiter = {
  check: (key: string) => Promise<void>;
};

export const RateLimiter = (
  limit: number,
  windowSec: number
): RateLimiter => {
  const store: Record<string, number[]> = {};

  const check = async (key: string) => {
    const now = Date.now();
    if (!store[key]) store[key] = [];
    store[key] = store[key].filter((t) => now - t < windowSec * 1000);
    if (store[key].length >= limit) {
      throw new Error("Too many requests");
    }
    store[key].push(now);
  };

  return { check };
};
