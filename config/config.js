require('dotenv').config()

const multiSigOwner = process.env.MULTISIG_OWNER
const ownerEOA = process.env.OWNER_EOA

const vestingDate = '09/04/2021 09:00'
const stakingDate = '14/04/2021 09:00'

const uniswapV2Addr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"


const tokenInfo = {
  // token info to test
  name: 'Ethereum Push Notification Service',
  symbol: 'PUSH',
  decimals: 18,
  supply: 100000000, // 100 Million $PUSH
}

module.exports = {
  tokenInfo,
  multiSigOwner,
  ownerEOA,
  vestingDate,
  stakingDate,
  uniswapV2Addr
}
