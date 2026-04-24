# ralph

This is the ralph CLI itself — a TypeScript project compiled to a single binary via bun.

- **Runtime:** bun (install/build/execute TS directly)
- **CLI framework:** jimkit-cli (declarative, typed)
- **Sandbox:** `@ai-hero/sandcastle` with Podman provider, rootless
- **Tests:** vitest (`bun vitest run`)
- **Typecheck:** `bun run typecheck`
- **Container image:** built with `podman build -t ralph .`
- **Build CLI binary:** `just build-cli`
