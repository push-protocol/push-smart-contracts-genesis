const { tokens, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../../helpers/utils')

const protocolusers = {
  tokens: tokens(1.6 * CONSTANT_1M), // approx 800 users, 2k tokens = 2M
}

module.exports = {
  protocolusers: protocolusers
}
