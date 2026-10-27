/** PostgREST returns an embedded to-one relation as an object or a one-element array. */
export type Joined<T> = T | T[] | null

export function one<T>(value: Joined<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}
