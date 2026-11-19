import test from 'node:test'
import assert from 'node:assert/strict'
import { handleAuthRequest } from './auth-handler.mjs'

const origin = 'https://pokemon.example'
const base = { method: 'POST', headers: { origin }, rawBody: '{}' }
test('auth handler rejects non-POST and untrusted origins', async () => {
  const db = {}
  assert.equal((await handleAuthRequest({ db, request: { ...base, method: 'GET' }, allowedOrigin: origin })).status, 405)
  assert.equal((await handleAuthRequest({ db, request: { ...base, headers: { origin: 'https://evil.test' }, action: 'login' }, allowedOrigin: origin })).status, 403)
})
test('auth handler rejects malformed and oversized payloads', async () => {
  const db = {}
  assert.equal((await handleAuthRequest({ db, request: { ...base, action: 'login', rawBody: '{' }, allowedOrigin: origin })).status, 400)
  assert.equal((await handleAuthRequest({ db, request: { ...base, action: 'login', rawBody: 'x'.repeat(8193) }, allowedOrigin: origin })).status, 413)
})
test('auth handler does not expose verification token or session token in JSON', async () => {
  const db = {
    async connect() {
      return { async query(sql, params) {
        if (sql === 'begin' || sql === 'commit') return { rows: [] }
        if (sql.includes('insert into public.app_users')) return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: params[0] }] }
        return { rows: [] }
      }, release() {} }
    },
  }
  let delivered
  const result = await handleAuthRequest({
    db, allowedOrigin: origin, deliverVerification: async message => { delivered = message },
    request: { ...base, action: 'register', rawBody: JSON.stringify({ email: 'a@example.com', password: 'a sufficiently long password' }) },
  })
  assert.equal(result.status, 202)
  assert.equal(Object.hasOwn(result.body, 'token'), false)
  assert.equal(typeof delivered.token, 'string')
})
test('unknown actions fail closed', async () => {
  const result = await handleAuthRequest({ db: {}, request: { ...base, action: 'other' }, allowedOrigin: origin })
  assert.equal(result.status, 404)
})
