const { bn } = require('../helpers/helpers');
const moment = require('moment');

const VESTING_CONTRACTS = ['Advisors.sol',];
const VESTING_CLIFF = 31536000; // Fri, 05 Feb 2022 00:00:00 GMT
const VESTING_START_TIME = 1612569600; // Fri, 06 Feb 2021 00:00:00 GMT
const VESTING_DURATION = 63072000;
const EPNS_ADVISORS_FUNDS_AMOUNT = "4000000000000000000000000";
const EPNS_COMMUNITY_FUNDS_AMOUNT = "3000000000000000000000000";
const TOTAL_EPNS_TOKENS = '100000000000000000000000000';

tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
dateToEpoch = function (dated) { return moment(dated, "DD/MM/YYYY HH:mm").valueOf() }
timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }

const tokenInfo = {
  // token info to test
  name: 'Ethereum Push Notification Service',
  symbol: 'PUSH',
  decimals: 18,
  supply: 100000000, // 100 Million $PUSH
}

const CONSTANT_100K = 100 * 1000
const CONSTANT_1M = CONSTANT_100K * 10

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

const VESTING_INFO = {
  advisors: advisors,
}

const TOKEN_INFO = {
  total: tokens(100 * CONSTANT_1M),
  advisors: advisors.deposit.tokens,
}

module.exports = {
  VESTING_INFO,
  TOKEN_INFO
        // VESTING_CLIFF,
        // VESTING_CONTRACTS,
        // VESTING_START_TIME,
        // EPNS_ADVISORS_FUNDS_AMOUNT,
        // EPNS_COMMUNITY_FUNDS_AMOUNT,
        // VESTING_DURATION,
        // TOTAL_EPNS_TOKENS
}
