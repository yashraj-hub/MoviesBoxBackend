const { buildUniversePayload, listUniverses } = require('../services/universe.service')

exports.listUniverses = async (_req, res, next) => {
  try {
    res.json({ universes: listUniverses() })
  } catch (err) {
    next(err)
  }
}

exports.getUniverse = async (req, res, next) => {
  try {
    const { universeKey } = req.params
    const data = await buildUniversePayload(universeKey)
    res.json(data)
  } catch (err) {
    next(err)
  }
}
