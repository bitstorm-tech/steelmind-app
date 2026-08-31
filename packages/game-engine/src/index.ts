// Pure combat simulation.
// Must not contain HTTP, database access, LLM calls, PlayCanvas code or network requests.
// Never use Math.random() here — all randomness comes from an explicit seeded RNG.

export const PACKAGE_NAME = "@steelmind/game-engine" as const;
