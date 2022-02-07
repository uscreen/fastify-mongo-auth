const tap = require('tap')
const { build } = require('./helper')

tap.test('fastify-mongo-auth: workflow', async (t) => {
  const fastify = await build(t, {})
  let validCookie = null
  t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      try {
        const { statusCode } = await fastify.inject({
          method: 'GET',
          url: '/currentUser'
        })
        t.equal(401, statusCode, 'should equal 401')
      } catch (err) {}
      t.end()
    }
  )
  t.test('should register a valid new user', async (t) => {
    try {
      const { statusCode } = await fastify.inject({
        method: 'POST',
        url: '/register',
        payload: {
          username: 'foo',
          password: 'bar'
        }
      })

      t.equal(200, statusCode, 'should equal 200')
    } catch (err) {}
    t.end()
  })

  t.test('should login a valid user', async (t) => {
    try {
      const { statusCode, cookies } = await fastify.inject({
        method: 'POST',
        url: '/login',
        payload: {
          username: 'foo',
          password: 'bar'
        }
      })

      t.equal(200, statusCode, 'should equal 200')
      validCookie = cookies.find((c) => c.name === 'session')
      t.ok(validCookie, 'delivered correct cookie')
    } catch (err) {}
    t.end()
  })

  t.test('should allow access on authenticated user', async (t) => {
    const cookies = {
      [validCookie.name]: validCookie.value
    }
    try {
      const { statusCode } = await fastify.inject({
        method: 'GET',
        url: '/currentUser',
        cookies
      })
      t.equal(200, statusCode, 'should equal 200')
    } catch (err) {}
    t.end()
  })

  t.test('should log out authenticated user', async (t) => {
    const validCookies = {
      [validCookie.name]: validCookie.value
    }
    try {
      const { statusCode, cookies } = await fastify.inject({
        method: 'POST',
        url: '/logout',
        cookies: validCookies
      })
      const deletedCookie = cookies.find((c) => c.name === 'session')
      t.equal(200, statusCode, 'should equal 200')
      t.ok(deletedCookie, 'deliver adjusted cookie')
      t.equal(deletedCookie.value, '', 'deliver empty cookie value')
      t.equal(
        new Date(deletedCookie.expires).getTime(),
        0,
        'reset expiration date'
      )
    } catch (err) {}
    t.end()
  })

  t.test(
    'should prohibit access to protected route on unauthorized request',
    async (t) => {
      try {
        const { statusCode } = await fastify.inject({
          method: 'GET',
          url: '/currentUser'
        })
        t.equal(401, statusCode, 'should equal 401')
      } catch (err) {}
      t.end()
    }
  )

  t.test('should prohibit login with false credentials', async (t) => {
    try {
      const { statusCode } = await fastify.inject({
        method: 'POST',
        url: '/login',
        payload: {
          username: 'foo',
          password: 'bar2'
        }
      })
      t.equal(401, statusCode, 'should equal 401')
    } catch (err) {}
    t.end()
  })

  t.end()
})

tap.test('fastify-mongo-auth: edges', async (t) => {
  const fastify = await build(t, {
    usernameToLowerCase: false,
    addSessionDecorator: true
  })
  let validCookie = null
  t.test('should register a valid new user', async (t) => {
    try {
      const { statusCode } = await fastify.inject({
        method: 'POST',
        url: '/register',
        payload: {
          username: 'UPPERCASE',
          password: 'bar'
        }
      })

      t.equal(200, statusCode, 'should equal 200')
    } catch (err) {}
    t.end()
  })
  t.test('should not login with lowercase user name', async (t) => {
    try {
      const { statusCode } = await fastify.inject({
        method: 'POST',
        url: '/login',
        payload: {
          username: 'uppercase',
          password: 'bar'
        }
      })

      t.equal(401, statusCode, 'should equal 401')
    } catch (err) {}
    t.end()
  })
  t.test('should login with uppercase user name', async (t) => {
    try {
      const { statusCode, cookies } = await fastify.inject({
        method: 'POST',
        url: '/login',
        payload: {
          username: 'UPPERCASE',
          password: 'bar'
        }
      })

      t.equal(200, statusCode, 'should equal 200')
      validCookie = cookies.find((c) => c.name === 'session')
      t.ok(validCookie, 'delivered correct cookie')
    } catch (err) {}
    t.end()
  })
})
