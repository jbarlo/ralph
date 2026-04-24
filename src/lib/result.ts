export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; exitCode?: number }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export function err<E = string>(error: E, exitCode?: number): Result<never, E> {
  return exitCode === undefined ? { ok: false, error } : { ok: false, error, exitCode }
}
