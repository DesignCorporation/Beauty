// Simplified auth stub for images-api (prod smoke)
async function authMiddleware(_req, _res, next) {
  return next();
}

module.exports = { authMiddleware };
