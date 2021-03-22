const { tokens, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../../helpers/utils')

const gitcoin = {
  tokens: tokens(6 * CONSTANT_100K), // approx 300 users, 2k tokens = 600k
}

module.exports = {
  gitcoin: gitcoin
}
