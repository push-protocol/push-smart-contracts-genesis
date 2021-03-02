const { tokenInfo } = require('../config/config')

const moment = require('moment')

// define functions and constants
const CONSTANT_1K = 1000
const CONSTANT_10K = 10 * CONSTANT_1K
const CONSTANT_100K = 10 * CONSTANT_10K
const CONSTANT_1M = 10 * CONSTANT_100K

bn = function(number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
tokensBN = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))) }
bnToInt = function (bnAmount) { return bnAmount.div(bn(10).pow(tokenInfo.decimals)) }

dateToEpoch = function (dated) { return moment(dated, "DD/MM/YYYY HH:mm").valueOf() / 1000 }
timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }
timeInDays = function (secs) { return (secs / (60 * 60 * 24)).toFixed(2) }
timeInDate = function (secs) { return moment(secs * 1000).format("DD MMM YYYY hh:mm a") }

vestedAmount = function (total, now, start, cliffDuration, duration) { return now < start + cliffDuration ? ethers.BigNumber.from(0) : total.mul(now - start).div(duration) }

module.exports = {
  CONSTANT_1K,
  CONSTANT_10K,
  CONSTANT_100K,
  CONSTANT_1M,
  bn,
  tokens,
  tokensBN,
  bnToInt,
  dateToEpoch,
  timeInSecs,
  timeInDays,
  timeInDate,
  vestedAmount,
}
