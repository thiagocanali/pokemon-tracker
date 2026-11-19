import test from 'node:test'
import assert from 'node:assert/strict'
import { registerAccount, verifyEmail, login, logout } from './auth-service.mjs'

function mockDb() {
  const state = { users: [], credentials: new Map(), tokens: new Map(), sessions: new Map(), queries: [] }
  const db = {
    state,
    async query(sql, params = []) {
      state.queries.push({ sql, params })
      if (sql.includes('select u.id, u.email, c.password_hash')) {
        const user = state.users.find(u => u.email === params[0] && u.verified)
        return { rows: user ? [{ id: user.id, email: user.email, password_hash: state.credentials.get(user.id) }] : [] }
      }
      if (sql.includes('insert into app_private.auth_sessions')) {
        state.sessions.set(params[1], params[0]); return { rowCount: 1, rows: [] }
      }
      if (sql.includes('update app_private.auth_sessions')) {
        const found = state.sessions.delete(params[0]); return { rowCount: found ? 1 : 0, rows: found ? [{ id: 'session' }] : [] }
      }
      throw new Error('Unexpected query: ' + sql)
    },
    async connect() {
      return {
        async query(sql, params = []) {
          state.queries.push({ sql, params })
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] }
          if (sql.includes('insert into public.app_users')) {
            const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: params[0], verified: false }
            if (state.users.some(u => u.email === user.email)) throw Object.assign(new Error('duplicate'), { code: '23505' })
            state.users.push(user); return { rows: [user] }
          }
          if (sql.includes('insert into app_private.auth_credentials')) {
            state.credentials.set(params[0], params[1]); return { rows: [] }
          }
          if (sql.includes('insert into app_private.auth_tokens')) {
            state.tokens.set(params[1], params[0]); return { rows: [] }
          }
          if (sql.includes('update app_private.auth_tokens')) {
            const id = state.tokens.get(params[0])
            if (!id) return { rows: [] }
            state.tokens.delete(params[0]); return { rows: [{ user_id: id }] }
          }
          if (sql.includes('update public.app_users')) {
            const user = state.users.find(u => u.id === params[0]); user.verified = true; return { rows: [] }
          }
          throw new Error('Unexpected transaction query: ' + sql)
        },
        release() {},
      }
    },
  }
  return db
}
test('registration delivers verification only through server callback and login requires verification', async () => {
  const db = mockDb()
  let delivery
  const created = await registerAccount(db, {
    email: ' Player@Example.com ',
    password: 'a sufficiently long password',
    deliverVerification: async message => { delivery = message },
  })
  assert.equal(created.email, 'player@example.com')
  assert.equal(created.verificationPending, true)
  assert.equal(Object.hasOwn(created, 'token'), false)
  assert.equal(delivery.email, created.email)
  assert.equal(await login(db, { email: created.email, password: 'a sufficiently long password' }), null)
  assert.equal(await verifyEmail(db, delivery.token), true)
  const session = await login(db, { email: created.email, password: 'a sufficiently long password' })
  assert.equal(session.user.id, created.id)
  assert.equal(session.token.length, 43)
  assert.equal(await logout(db, session.token), true)
  assert.equal(await logout(db, session.token), false)
})
test('registration validates email, password and verification delivery dependency', async () => {
  const db = mockDb()
  await assert.rejects(registerAccount(db, { email: 'invalid', password: 'a sufficiently long password', deliverVerification: async () => {} }), TypeError)
  await assert.rejects(registerAccount(db, { email: 'x@example.com', password: 'short', deliverVerification: async () => {} }), TypeError)
  await assert.rejects(registerAccount(db, { email: 'x@example.com', password: 'a sufficiently long password' }), TypeError)
})
