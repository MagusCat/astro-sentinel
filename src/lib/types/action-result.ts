/**
 * Standard Server Action Response
 * 
 * Provides a consistent structure for all server actions, 
 * making it easier to handle errors and validation on the client.
 */
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: Record<string, string[]>
}

/**
 * Helper to create a successful ActionResult
 */
export function successResult<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Helper to create an error ActionResult
 */
export function errorResult(message: string, validationErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, error: message, validationErrors }
}
