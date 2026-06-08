/**
 * Password Hashing Module
 *
 * Single responsibility: bcrypt hash and compare operations.
 * Server-only — never import from client components.
 */

import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  plaintext: string,
  hashFromDb: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hashFromDb)
}
