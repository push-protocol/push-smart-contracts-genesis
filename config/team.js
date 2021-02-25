const { tokenInfo } = require('./universal')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const team = {
  deposit: {
    tokens: tokens(16 * CONSTANT_1M), // 16 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
  },
  factory: {
    team1: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(6 * CONSTANT_1M), // 6M Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60) // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
    },
    team2: {
      address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
      tokens: tokens(6 * CONSTANT_1M), // 6M Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60) // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
    },
  }
}

module.exports = {
  team
}
