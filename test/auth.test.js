import tap from 'tap'
import { build } from './helper.js'

tap.test('fastify-mongo-auth: workflow', async (t) => {
  const fastify = await build(t, {})
  let currentCookie = null
  t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser'
      })
      t.equal(401, statusCode, 'should equal 401')
    }
  )
  t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
  })

  t.test('should login a valid user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
    currentCookie = cookies.find((c) => c.name === 'session')
    t.ok(currentCookie, 'delivered correct cookie')
  })

  t.test('should allow access on authenticated user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'GET',
      url: '/currentUser',
      cookies: {
        [currentCookie.name]: currentCookie.value
      }
    })
    t.equal(200, statusCode, 'should equal 200')
  })

  t.test('should log out authenticated user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/logout',
      cookies: {
        [currentCookie.name]: currentCookie.value
      }
    })
    currentCookie = cookies.find((c) => c.name === 'session')
    t.equal(200, statusCode, 'should equal 200')
    t.ok(currentCookie, 'deliver adjusted cookie')
    t.equal(currentCookie.value, '', 'deliver empty cookie value')
    t.equal(
      new Date(currentCookie.expires).getTime(),
      0,
      'reset expiration date'
    )
  })

  t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser',
        cookies: {
          [currentCookie.name]: currentCookie.value
        }
      })
      t.equal(401, statusCode, 'should equal 401')
    }
  )

  t.test('should prohibit login with false credentials', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar2'
      }
    })
    t.equal(401, statusCode, 'should equal 401')
  })
})

tap.test('fastify-mongo-auth: edges', async (t) => {
  const fastify = await build(t, {
    usernameToLowerCase: false,
    addSessionDecorator: true
  })
  t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'UPPERCASE',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
  })
  t.test('should not login with lowercase user name', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'uppercase',
        password: 'bar'
      }
    })

    t.equal(401, statusCode, 'should equal 401')
  })
  t.test('should login with uppercase user name', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'UPPERCASE',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
    const currentCookie = cookies.find((c) => c.name === 'session')
    t.ok(currentCookie, 'delivered correct cookie')
  })
})

tap.test('fastify-mongo-auth: filter', async (t) => {
  const filter = { disabled: { $ne: true } }

  const fastify = await build(t, { filter })
  let currentCookie = null

  t.test('should register a valid new user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
  })

  t.test('should login a valid user', async (t) => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })

    t.equal(200, statusCode, 'should equal 200')
    currentCookie = cookies.find((c) => c.name === 'session')
    t.ok(currentCookie, 'delivered correct cookie')
  })

  t.test(
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
      t.equal(401, statusCode, 'should equal 401')
    }
  )

  t.test('should not login disabled user', async (t) => {
    const { statusCode } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'foo',
        password: 'bar'
      }
    })
    t.equal(401, statusCode, 'should equal 401')
  })
})
