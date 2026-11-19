import test from 'node:test'
import assert from 'node:assert/strict'
import { hashOpaqueToken, resolveSession } from './session.mjs'
import { listTeams, createTeam, updateTeam, deleteTeam } from './teams.mjs'

const alice = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const bob = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
const teamId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const token = 'a'.repeat(43)

test('session resolver rejects invalid tokens before touching DB', async () => {
  const db = { query: () => { throw new Error('Must not query') } }
  assert.equal(await resolveSession(db, ''), null)
  assert.equal(await resolveSession(db, 'injected-token;--'), null)
  assert.equal(hashOpaqueToken(token)?.length, 64)
})
test('session resolver only returns authenticated DB results', async () => {
  const calls = []
  const db = { query: async (sql, params) => {
    calls.push({ sql, params })
    return { rows: [] }
  } }
  assert.equal(await resolveSession(db, token), null)
  assert.match(calls[0].sql, /revoked_at is null/)
  assert.match(calls[0].sql, /expires_at > now\(\)/)
  assert.deepEqual(calls[0].params, [hashOpaqueToken(token)])
})
test('every team query scopes by authenticated user', async () => {
  const calls = []
  const db = { query: async (sql, params) => {
    calls.push({ sql, params })
    return { rows: [], rowCount: 0 }
  } }
  await listTeams(db, alice)
  await createTeam(db, alice, { name: ' Team ', pokemonIds: [25] })
  await updateTeam(db, alice, teamId, { name: 'Team', pokemonIds: [149] })
  await deleteTeam(db, alice, teamId)
  assert.equal(calls.length, 4)
  for (const { sql, params } of calls) {
    assert.equal(params[0], alice.id)
    assert.match(sql, /user_id = \$1|\(user_id, name, pokemon_ids\)/)
  }
  assert.deepEqual(calls[1].params, [alice.id, 'Team', [25]])
})
test('other users cannot select, mutate or delete by supplying owner ID', async () => {
  const db = { query: async (sql, params) => {
    assert.equal(params[0], bob.id)
    assert.doesNotMatch(sql, /aaaaaaaa-aaaa/)
    return { rows: [], rowCount: 0 }
  } }
  assert.deepEqual(await listTeams(db, bob), [])
  assert.equal(await updateTeam(db, bob, teamId, { name: 'No', pokemonIds: [25] }), null)
  assert.equal(await deleteTeam(db, bob, teamId), false)
})
test('invalid or unauthenticated requests fail before DB access', async () => {
  const db = { query: () => { throw new Error('Must not query') } }
  await assert.rejects(listTeams(db, null), TypeError)
  await assert.rejects(createTeam(db, alice, { name: '', pokemonIds: [25] }), TypeError)
  await assert.rejects(createTeam(db, alice, { name: 'ok', pokemonIds: [0] }), TypeError)
  await assert.rejects(updateTeam(db, alice, 'bad', { name: 'ok', pokemonIds: [25] }), TypeError)
  await assert.rejects(deleteTeam(db, null, teamId), TypeError)
})
