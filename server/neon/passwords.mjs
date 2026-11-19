import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64
const COST = 16384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const MAXMEM = 64 * 1024 * 1024

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new TypeError('Password must contain 12 to 256 characters')
  }
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAXMEM,
  })
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string' || encoded.length > 256) return false
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltText, hashText] = parts
  if (n !== String(COST) || r !== String(BLOCK_SIZE) || p !== String(PARALLELIZATION) ||
      !/^[A-Za-z0-9_-]{22}$/.test(saltText) || !/^[A-Za-z0-9_-]{86}$/.test(hashText)) return false
  try {
    const salt = Buffer.from(saltText, 'base64url')
    const expected = Buffer.from(hashText, 'base64url')
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false
    const actual = await scrypt(password, salt, KEY_LENGTH, {
      N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAXMEM,
    })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
