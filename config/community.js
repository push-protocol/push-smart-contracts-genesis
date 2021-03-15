const { tokenInfo } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const { stakingInfo } = require('./community_breakup/staking')
const { nfts } = require('./community_breakup/nfts')

const { strategicMapping } = require('./community_breakup/strategicMappingInfo')

const commreservoir = {
  deposit: {
    address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
    tokens: tokens(43 * CONSTANT_1M), // 43 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(60, 24, 60, 60), // 0 Days in secs = 0d * 0h * 0m * 0s
    duration: timeInSecs(120, 24, 60, 60)
  }
}

const publicsale = {
  deposit: {
    tokens: tokens(3 * CONSTANT_1M) // 5 Million Tokens
  }
}

const strategic = {
  deposit: {
    tokens: tokens(2 * CONSTANT_1M), // 3 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(24 * 30, 24, 60, 60) // 730 Days in secs = 730d * 0h * 0m * 0s
  },
  factory: strategicMapping,
  encrypted: {
    text: "plain"
  }
}

const gratitude = {
  nfts: nfts,
}

const community = {
  commreservoir: commreservoir,
  publicsale: publicsale,
  strategic: strategic,
  gratitude: gratitude
}

module.exports = {
  community
}
