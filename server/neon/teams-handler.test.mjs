import test from 'node:test'
import assert from 'node:assert/strict'
import { handleTeamsRequest } from './teams-handler.mjs'
import { sessionCookie, parseSessionCookie } from './http-auth.mjs'
import { hashOpaqueToken } from './session.mjs'

const token = 'a'.repeat(43)
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@example.test' }
const origin = 'https://pokemon.example'
const teamId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const headers = { cookie: sessionCookie(token).split(';')[0], origin }
function dbStub({ authenticated = true } = {}) {
  const calls = []
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params })
      if (sql.includes('auth_sessions')) {
        assert.deepEqual(params, [hashOpaqueToken(token)])
        return { rows: authenticated ? [user] : [] }
      }
      return { rows: [], rowCount: 0 }
    },
  }
}
test('anonymous requests cannot access teams', async () => {
  const db = { query: () => { throw new Error('Must not query') } }
  const result = await handleTeamsRequest({ db, request: { method: 'GET', headers: {} }, allowedOrigin: origin })
  assert.equal(result.status, 401)
})
test('session cookie can be read without accepting attributes as token', () => {
  assert.equal(parseSessionCookie(headers.cookie), token)
})
test('GET only returns authenticated user teams', async () => {
  const db = dbStub()
  const result = await handleTeamsRequest({ db, request: { method: 'GET', headers }, allowedOrigin: origin })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { teams: [] })
  assert.equal(db.calls[1].params[0], user.id)
})
test('mutation requires trusted origin', async () => {
  const db = dbStub()
  const result = await handleTeamsRequest({ db, request: { method: 'DELETE', teamId, headers: { ...headers, origin: 'https://evil.test' } }, allowedOrigin: origin })
  assert.equal(result.status, 403)
  assert.equal(db.calls.length, 1)
})
test('cross-user team update returns not found', async () => {
  const db = dbStub()
  const result = await handleTeamsRequest({ db, request: { method: 'PUT', teamId, headers, rawBody: JSON.stringify({ name: 'Team', pokemonIds: [25] }) }, allowedOrigin: origin })
  assert.equal(result.status, 404)
  assert.equal(db.calls[1].params[0], user.id)
  assert.equal(db.calls[1].params[1], teamId)
})
test('rejects oversized or malformed request bodies', async () => {
  const db = dbStub()
  const request = { method: 'POST', headers, rawBody: 'x'.repeat(4097) }
  assert.equal((await handleTeamsRequest({ db, request, allowedOrigin: origin })).status, 413)
  request.rawBody = '{'
  assert.equal((await handleTeamsRequest({ db, request, allowedOrigin: origin })).status, 400)
})
