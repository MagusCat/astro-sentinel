/**
 * Password Hashing Module
 *
 * Single responsibility: bcrypt hash and compare operations.
 * Server-only — never import from client components.
 */

import { hash, compare } from 'bcrypt-ts'
import { APP_CONFIG } from '@/lib/config'

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, APP_CONFIG.auth.bcryptRounds)
}

export async function verifyPassword(
  plaintext: string,
  hashFromDb: string
): Promise<boolean> {
  return compare(plaintext, hashFromDb)
}
