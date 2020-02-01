'use strict'

const envSchema = require('env-schema')
const fp = require('fastify-plugin')
const session = require('fastify-secure-session')
const securePassword = require('secure-password')
const pwd = securePassword()

const schema = {
  type: 'object',
  required: ['key'],
  properties: {
    key: {},
    decorateRequest: {
      default: 'user'
    },
    collection: {
      default: 'accounts'
    },
    usernameToLowerCase: {
      default: true
    },
    usernameField: {
      default: 'username'
    },
    passwordField: {
      default: 'password'
    }
  }
}

const fastifyMongoAuth = async (fastify, opts, next) => {
  const {
    decorateRequest: user,
    collection,
    usernameToLowerCase,
    usernameField,
    passwordField
  } = envSchema({
    schema: schema,
    data: opts,
    dotenv: opts.useDotenv
  })

  fastify.decorateRequest(user, null)

  /**
   * session config
   */
  fastify.register(session, {
    key: opts.key,
    cookie: {
      path: '/'
    }
  })

  /**
   * verify any request with existing session
   */
  fastify.addHook('preHandler', async (req, res) => {
    req[user] = null
    const sid = req.session.get('_id')
    try {
      req[user] = sid && (await auth.collection.read(sid))
    } catch (err) /* istanbul ignore next */ {
      fastify.log.error(err)
    }
  })

  /**
   * auth object factory
   */
  const auth = {
    get collection() {
      return fastify.crud(collection)
    },

    /**
     * utility to require auth on some routes
     */
    authorized(req, res, next) {
      const _id = req.session.get('_id')
      if (_id && req[user] && _id === req[user]._id.toString()) {
        return next()
      }
      return res.unauthorized()
    },

    /**
     * hashing
     */
    createHash(password) {
      return pwd.hashSync(Buffer.from(password)).toString('base64')
    },

    /**
     * verification
     */
    verifyHash(password, hash) {
      const verified = pwd.verifySync(
        Buffer.from(password),
        Buffer.from(hash, 'base64')
      )
      return verified === securePassword.VALID
    },

    /**
     * handler to be called on POST /login
     */
    async loginHandler(req) {
      const query = {}
      query[usernameField] = usernameToLowerCase
        ? req.body[usernameField].toLowerCase()
        : req.body[usernameField]
      const account = await auth.collection.findOne(query).catch(e => {
        fastify.log.error(e)
      })
      if (account && auth.verifyHash(req.body[passwordField], account.hash)) {
        req.session.set('_id', account._id)
        return { account }
      }
      throw fastify.httpErrors.unauthorized()
    },

    /**
     * handler to be called on GET /logout
     */
    async logoutHandler(req) {
      req.session.delete()
      return {}
    },

    /**
     * handler to be called on GET /currentUser
     */
    async currentUserHandler(req) {
      const currentUser = {}
      currentUser[user] = req[user]
      return currentUser
    }
  }

  /**
   * decorate fastify app with auth object
   */
  fastify.decorate('auth', auth)

  next()
}

module.exports = fp(fastifyMongoAuth, {
  fastify: '>=2.x',
  name: 'fastify-mongo-auth',
  decorators: {
    fastify: ['httpErrors', 'crud']
  },
  dependencies: ['fastify-sensible', 'fastify-mongo-crud']
})
