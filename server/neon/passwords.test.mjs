import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from './passwords.mjs'

test('password hashing stores a salted versioned scrypt digest', async () => {
  const first = await hashPassword('correct horse battery staple')
  const second = await hashPassword('correct horse battery staple')
  assert.match(first, /^scrypt\$16384\$8\$1\$/)
  assert.notEqual(first, second)
  assert.equal(await verifyPassword('correct horse battery staple', first), true)
  assert.equal(await verifyPassword('wrong password', first), false)
})
test('password hashing rejects weak inputs and malformed encodings', async () => {
  await assert.rejects(hashPassword('short'), TypeError)
  assert.equal(await verifyPassword('password', 'invalid'), false)
  assert.equal(await verifyPassword('password', 'scrypt$999$8$1$' + 'a'.repeat(22) + '$' + 'b'.repeat(86)), false)
})
