# Steelmind

Turn-based mech combat. Players configure the Brain, an LLM decides, the engine resolves.

See `SPEC.md` for the full specification.

## Layout

```
apps/web              Vue 3 + Vite frontend
apps/server           Bun + Hono API
packages/game-types   Shared types and Zod schemas
packages/game-engine  Pure, deterministic combat simulation
packages/brain-engine Brain validation, triggers, LLM context
```

## Commands

```
bun install
bun run typecheck       # tsc / vue-tsc in every workspace
bun test                # engine + server tests (bun test), web tests (vitest)
bun run dev             # server + web together
bun run dev:server      # http://localhost:3000/health
bun run dev:web         # http://localhost:5173
```

## Dependency notes

- TypeScript is pinned to 6.x on purpose. `vue-tsc` (3.3.x) cannot load TypeScript 7
  (`ERR_PACKAGE_PATH_NOT_EXPORTED: ./lib/tsc`). Bump to 7 once vue-tsc supports it.
