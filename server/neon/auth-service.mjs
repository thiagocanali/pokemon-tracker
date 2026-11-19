import { randomBytes, createHash } from 'node:crypto'
import { hashPassword, verifyPassword } from './passwords.mjs'

const SESSION_SECONDS = 7 * 24 * 60 * 60
const TOKEN_SECONDS = 30 * 60
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function transaction(db, work) {
  if (typeof db?.connect !== 'function') throw new TypeError('A pooled PostgreSQL client is required')
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string' || email.length > 254) throw new TypeError('Invalid email')
  const normalized = email.trim().toLowerCase()
  if (!emailPattern.test(normalized)) throw new TypeError('Invalid email')
  return normalized
}
function newOpaqueToken() { return randomBytes(32).toString('base64url') }

export async function registerAccount(db, { email, password, deliverVerification }) {
  const normalized = normalizeEmail(email)
  if (typeof deliverVerification !== 'function') throw new TypeError('Verification delivery is required')
  const passwordHash = await hashPassword(password)
  const verificationToken = newOpaqueToken()
  const user = await transaction(db, async client => {
    const inserted = await client.query(
      'insert into public.app_users(email) values ($1) returning id, email',
      [normalized],
    )
    const created = inserted.rows[0]
    await client.query(
      'insert into app_private.auth_credentials(user_id, password_hash) values ($1, $2)',
      [created.id, passwordHash],
    )
    await client.query(
      "insert into app_private.auth_tokens(user_id, purpose, token_hash, expires_at) values ($1, 'email_verification', $2, now() + interval '30 minutes')",
      [created.id, sha256(verificationToken)],
    )
    return created
  })
  // Delivery is server-side only; never return the raw verification token to the browser.
  await deliverVerification({ email: normalized, token: verificationToken })
  return { id: user.id, email: user.email, verificationPending: true }
}

export async function verifyEmail(db, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false
  return transaction(db, async client => {
    const result = await client.query(
      "update app_private.auth_tokens set consumed_at = now() where token_hash = $1 and purpose = 'email_verification' and consumed_at is null and expires_at > now() returning user_id",
      [sha256(token)],
    )
    if (!result.rows[0]) return false
    await client.query('update public.app_users set email_verified_at = now(), updated_at = now() where id = $1', [result.rows[0].user_id])
    return true
  })
}

export async function login(db, { email, password }) {
  const normalized = normalizeEmail(email)
  if (typeof password !== 'string' || password.length > 256) return null
  const { rows } = await db.query(
    `select u.id, u.email, c.password_hash
       from public.app_users u
       join app_private.auth_credentials c on c.user_id = u.id
      where u.email = $1 and u.email_verified_at is not null limit 1`,
    [normalized],
  )
  const user = rows[0]
  // Perform a dummy scrypt when no eligible user exists to reduce account enumeration timing.
  const valid = await verifyPassword(password, user?.password_hash ?? 'invalid')
  if (!user || !valid) return null
  const token = newOpaqueToken()
  await db.query(
    'insert into app_private.auth_sessions(user_id, token_hash, expires_at) values ($1, $2, now() + ($3 * interval \'1 second\'))',
    [user.id, sha256(token), SESSION_SECONDS],
  )
  return { user: { id: user.id, email: user.email }, token, maxAge: SESSION_SECONDS }
}

export async function logout(db, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false
  const result = await db.query(
    'update app_private.auth_sessions set revoked_at = now() where token_hash = $1 and revoked_at is null returning id',
    [sha256(token)],
  )
  return result.rowCount > 0
}
