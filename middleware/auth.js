const jwt = require('jsonwebtoken')
const User = require('../models/User')

const authRequired = async (req, res, next) => {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authorization token is required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.sub).lean()

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    const sessionExists = user.sessions?.some((s) => s.tokenId === decoded.jti)

    if (!sessionExists) {
      return res.status(401).json({ message: 'Session expired. Please login again.' })
    }

    req.user = decoded
    req.authUser = user
    next()
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = authRequired
