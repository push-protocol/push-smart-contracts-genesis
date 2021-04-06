const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const team = {
  deposit: {
    tokens: tokens(16 * CONSTANT_1M), // 16 Million Tokens
    start: dateToEpoch(vestingDate), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
  },
  factory: {
    team1: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(6 * CONSTANT_1M), // 6M Tokens
      start: dateToEpoch(vestingDate), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60), // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: true
    },
    team2: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(6 * CONSTANT_1M), // 6M Tokens
      start: dateToEpoch(vestingDate), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60), // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: true
    },
  }
}

module.exports = {
  team
}
