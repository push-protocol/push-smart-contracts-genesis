const { tokenInfo } = require('../config/universal')

const moment = require('moment')

// define functions and constants
const CONSTANT_100K = 100 * 1000
const CONSTANT_1M = CONSTANT_100K * 10

bn = function(number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
tokensBN = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))) }
bnToInt = function (bnAmount) { return bnAmount.div(bn(10).pow(tokenInfo.decimals)) }

dateToEpoch = function (dated) { return moment(dated, "DD/MM/YYYY HH:mm").valueOf() }
timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }

vestedAmount = function (total, now, start, cliffDuration, duration) { return now < start + cliffDuration ? ethers.BigNumber.from(0) : total.mul(now - start).div(duration) }

module.exports = {
  CONSTANT_100K,
  CONSTANT_1M,
  bn,
  tokens,
  tokensBN,
  bnToInt,
  dateToEpoch,
  timeInSecs,
  vestedAmount,
}
