export function getEnv(key: string): string | undefined {
  // In Next.js, process.env is the standard way to access variables in both runtimes.
  // We ensure we don't have any hidden space or weirdness.
  const value = process.env[key]
  return value
}

