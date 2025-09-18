import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from './setup.js'

test('fastify-mongo-auth: workflow', async (t) => {
  const fastify = await build(t, {})
  let currentCookie = null
  await t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser'
      })
      assert.equal(statusCode, 401, 'should equal 401')
    }
  )
  await t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
  })

  await t.test('should login a valid user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
    currentCookie = cookies.find((c) => c.name === 'session')
    assert.ok(currentCookie, 'delivered correct cookie')
  })

  await t.test('should allow access on authenticated user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'GET',
      url: '/currentUser',
      cookies: {
        [currentCookie.name]: currentCookie.value
      }
    })
    assert.equal(statusCode, 200, 'should equal 200')
  })

  await t.test('should log out authenticated user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/logout',
      cookies: {
        [currentCookie.name]: currentCookie.value
      }
    })
    currentCookie = cookies.find((c) => c.name === 'session')
    assert.equal(statusCode, 200, 'should equal 200')
    assert.ok(currentCookie, 'deliver adjusted cookie')
    assert.equal(currentCookie.value, '', 'deliver empty cookie value')
    assert.equal(
      new Date(currentCookie.expires).getTime(),
      0,
      'reset expiration date'
    )
  })

  await t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser',
        cookies: {
          [currentCookie.name]: currentCookie.value
        }
      })
      assert.equal(statusCode, 401, 'should equal 401')
    }
  )

  await t.test('should prohibit login with false credentials', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar2'
      }
    })
    assert.equal(statusCode, 401, 'should equal 401')
  })
})

test('fastify-mongo-auth: edges', async (t) => {
  const fastify = await build(t, {
    usernameToLowerCase: false,
    addSessionDecorator: true
  })
  await t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'UPPERCASE',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
  })
  await t.test('should not login with lowercase user name', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'uppercase',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 401, 'should equal 401')
  })
  await t.test('should login with uppercase user name', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'UPPERCASE',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
    const currentCookie = cookies.find((c) => c.name === 'session')
    assert.ok(currentCookie, 'delivered correct cookie')
  })
})

test('fastify-mongo-auth: filter', async (t) => {
  const filter = { disabled: { $ne: true } }

  const fastify = await build(t, { filter })
  let currentCookie = null

  await t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
  })

  await t.test('should login a valid user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    assert.equal(statusCode, 200, 'should equal 200')
    currentCookie = cookies.find((c) => c.name === 'session')
    assert.ok(currentCookie, 'delivered correct cookie')
  })

  await t.test(
    'should prohibit access to protected route for logged in, but disabled user',
    async (t) => {
      await fastify.auth.collection.collection.updateOne(
        { username: 'foo' },
        { $set: { disabled: true } }
      )

      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser',
        cookies: {
          [currentCookie.name]: currentCookie.value
        }
      })
      assert.equal(statusCode, 401, 'should equal 401')
    }
  )

  await t.test('should not login disabled user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })
    assert.equal(statusCode, 401, 'should equal 401')
  })
})
