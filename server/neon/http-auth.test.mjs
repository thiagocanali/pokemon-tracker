import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSessionCookie, sessionCookie, clearSessionCookie, isTrustedMutationOrigin, requireTrustedMutationOrigin } from './http-auth.mjs'

const token = 'z'.repeat(43)
test('session cookie uses host-only secure attributes', () => {
  const cookie = sessionCookie(token)
  assert.match(cookie, /^__Host-pokemon_session=/)
  for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=604800']) {
    assert.ok(cookie.includes(attribute))
  }
  assert.doesNotMatch(cookie, /Domain=/)
  assert.equal(parseSessionCookie('foo=bar; __Host-pokemon_session=' + token), token)
  assert.equal(parseSessionCookie('__Host-pokemon_session=' + token + '; __Host-pokemon_session=' + token), null)
  assert.equal(parseSessionCookie('__Host-pokemon_session=bad'), null)
  assert.match(clearSessionCookie(), /Max-Age=0/)
})
test('session cookie rejects unsafe tokens and lifetimes', () => {
  assert.throws(() => sessionCookie('bad'), TypeError)
  assert.throws(() => sessionCookie(token, 604801), TypeError)
})
test('mutation origin requires exact HTTPS origin', () => {
  const trusted = 'https://pokemon.example'
  assert.equal(isTrustedMutationOrigin(trusted, trusted), true)
  for (const origin of ['http://pokemon.example', 'https://pokemon.example.evil.test', 'https://evil.test', 'null', '', undefined]) {
    assert.equal(isTrustedMutationOrigin(origin, trusted), false)
  }
  assert.doesNotThrow(() => requireTrustedMutationOrigin({ headers: { origin: trusted } }, trusted))
  assert.throws(() => requireTrustedMutationOrigin({ headers: { origin: 'https://evil.test' } }, trusted), { statusCode: 403 })
})
