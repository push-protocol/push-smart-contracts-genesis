const { tokenInfo } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const advisors = {
  deposit: {
    tokens: tokens(3.5 * CONSTANT_1M), // 3.5 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(365 * 3, 24, 60, 60) // 3 * 365 Days in secs = 3y * 365d * 24h * 60m * 60s
  },
  factory: {
    vivek: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(4 * CONSTANT_100K), // 400k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(182, 24, 60, 60),
      revocable: true
    },
    gitcoin: {
      address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
      tokens: tokens(6 * CONSTANT_100K), // 600k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(182, 24, 60, 60),
      revocable: true
    },
    defidad: {
      address: '0x937Cf6ddC3080d53B3C4067B23687305371C4b3a',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(240, 24, 60, 60),
      revocable: true
    },
    nischal: {
      address: '0x0a651cF7A9b60082fecdb5f30DB7914Fd7d2cf93',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(120, 24, 60, 60),
      revocable: true
    },
  },
  encrypted: {
    text: "plain"
  }
}


module.exports = {
  advisors
}
