const { bn } = require('../helpers/helpers');
const moment = require('moment');

tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
dateToEpoch = function (dated) { return moment(dated, "DD/MM/YYYY HH:mm").valueOf() }
timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }

const CONSTANT_100K = 100 * 1000
const CONSTANT_1M = CONSTANT_100K * 10
const MULTI_SIG_OWNER = "0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D"

const tokenInfo = {
  // token info to test
  name: 'Ethereum Push Notification Service',
  symbol: 'PUSH',
  decimals: 18,
  supply: 100000000, // 100 Million $PUSH
}

const advisors = {
  deposit: {
    tokens: tokens(3.5 * CONSTANT_1M), // 3.5 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(365, 24, 60, 60) // 365 Days in secs = 365d * 24h * 60m * 60s
  },
  factory: {
    vivek: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(4 * CONSTANT_100K), // 400k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(182, 24, 60, 60)
    },
    gitcoin: {
      address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
      tokens: tokens(6 * CONSTANT_100K), // 600k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(182, 24, 60, 60)
    },
    defidad: {
      address: '0x937Cf6ddC3080d53B3C4067B23687305371C4b3a',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(182, 24, 60, 60)
    },
    nischal: {
      address: '0x0a651cF7A9b60082fecdb5f30DB7914Fd7d2cf93',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(120, 24, 60, 60)
    },
  }
}

const community = {
  commreservoir: {
    deposit: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(43 * CONSTANT_1M), // 43 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(60, 24, 60, 60), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(120, 24, 60, 60)
    }
  },
  publicsale: {
    deposit: {
      tokens: tokens(5 * CONSTANT_1M) // 5 Million Tokens
    }
  },
  strategic: {
    deposit: {
      tokens: tokens(3 * CONSTANT_1M), // 3 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(120, 24, 60, 60) // 0 Days in secs = 0d * 0h * 0m * 0s
    },
    factory: {

    },
  },
  lprewards: {
    deposit: {
      tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
    }
  },
  staking: {
    deposit: {
      tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
    }
  }
}

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

const VESTING_INFO = {
  owner: '',
  advisors: advisors,
  community: community,
  team: team
}

const TOKEN_INFO = {
  total: tokens(100 * CONSTANT_1M),
  advisors: advisors.deposit.tokens,
  commreservoir: community.commreservoir.deposit.tokens,
  publicsale: community.publicsale.deposit.tokens,
  strategic: community.strategic.deposit.tokens,
  lprewards: community.lprewards.deposit.tokens,
  staking: community.staking.deposit.tokens,
  team: team.deposit.tokens
}

const META_INFO = {
  eventualOwner: MULTI_SIG_OWNER
}

module.exports = {
  VESTING_INFO,
  TOKEN_INFO,
  META_INFO,
}
