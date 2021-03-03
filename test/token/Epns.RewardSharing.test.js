// Import helper functions
const { bn } = require('../../helpers/helpers')

// We import Chai to use its asserting functions here.
const { expect } = require("chai")

require("@nomiclabs/hardhat-ethers")

describe("$PUSH Token Reward Sharing Test Cases", function () {
  const tokenInfo = {
    // token info to test
    name: 'Ethereum Push Notification Service',
    symbol: 'PUSH',
    decimals: 18,
    supply: 100000000, // 100 Million $PUSH
  }

  const initialSupply = bn(tokenInfo.supply, 0).mul(bn(10).pow(bn(tokenInfo.decimals))) // 100 Million Tokens

  // Define configuration initial
  let initialBalances
  let initialAllowances
  let create

  let Token
  let token
  let tokens
  let uintMax

  let contract
  let decimals

  let options

  let owner
  let alice
  let bob
  let charles

  before(async function () {
    [owner, alice, bob, charles] = await ethers.getSigners()

    // Define Options
    options = {
      // factory method to create new token contract
      create: async function () {
      	Token = await ethers.getContractFactory("EPNS")
        return Token.deploy(owner.address)
      },

      // token info to test
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,

      // initial state to test
      initialBalances: [
        [owner, initialSupply]
      ],
      initialAllowances: [
        [owner, alice, 0]
      ]
    }

    // configure
    initialBalances = options.initialBalances || []
    initialAllowances = options.initialAllowances || []
    create = options.create

    // setup
    tokens = function (amount) { return bn(amount).mul(bn(10).pow(decimals)) }
    unitsToTokens = function (bnAmount) { return bnAmount.div(bn(10).pow(decimals)) }

    uintMax = bn(2).pow(bn(256)).sub(1)

    contract = null
    decimals = 0
  })

  beforeEach(async function () {
    contract = await create()
    decimals = (contract.decimals ? await contract.decimals() : 0)

    if (options.beforeEach) {
      await options.beforeEach(contract)
    }
  })

  afterEach(async function () {
    if (options.afterEach) {
      await options.afterEach(contract)
    }
    contract = null
    decimals = 0
  })

  async function AdjustableWeight(sourceAddress, destAddress, amount) {
    const destWeight = bn(await contract.holderWeight(destAddress)).mul(await contract.balanceOf(destAddress))
    const sourceWeight = bn(await contract.holderWeight(sourceAddress)).mul(amount)
    const totalWeight = bn(destWeight).add(sourceWeight);
    const totalAmount = bn(await contract.balanceOf(destAddress)).add(amount)
    const totalAmountBy2 = totalAmount.div(bn(2))
    const roundUpWeight = totalWeight.add(totalAmountBy2)
    return roundUpWeight.div(totalAmount)
  }

  describe('Reward Share Holder Weight', function () {
    it(`should have 'born' and 'holderWeight' to be initally same`, async function () {
      const holderWeight = await contract.holderWeight(owner.address)
      expect(await contract.born()).to.equal(holderWeight)
    })

    it(`should have 'born' as the block number of contract deploy`, async function () {
      expect(await contract.born()).to.equal(contract.deployTransaction.blockNumber)
    })

    it(`should reflect accurate block number on transfer`, async function () {
      let blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokens(10))

      expect(await contract.holderWeight(alice.address)).to.equal(blockNumber)
    })

    it(`should reflect same block number on transfer back`, async function () {
      let blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokens(10))
      await contract.connect(alice).transfer(owner.address, tokens(10))

      expect(await contract.holderWeight(owner.address)).to.equal(blockNumber)
    })
      
    it(`should reflect same block number on multiple transfer`, async function () {
      const blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokens(1))

      // tx = mine block
      await contract.connect(alice).transfer(bob.address, tokens(1))

      // tx = mine block
      await contract.transfer(bob.address, tokens(1))
      expect(await contract.holderWeight(bob.address)).to.equal(blockNumber)
    })

    it(`should adjust weight on reset`, async function () {
      await contract.transfer(alice.address, tokens(1))

      const tx = await contract.connect(alice).resetHolderWeight()
      ethers.provider.send("evm_mine")
      expect(await contract.holderWeight(alice.address)).to.equal(tx.blockNumber)
    })

    it(`should properly reflect adjusted weight on transfer after reset`, async function () {
      await contract.transfer(bob.address, tokens(1))
      await contract.connect(bob).resetHolderWeight()

      await contract.transfer(bob.address, tokens(1))
      const ownerWeight = await contract.holderWeight(owner.address)

      expect(await contract.holderWeight(bob.address)).to.not.equal(ownerWeight)
    })
      
    it(`should reflect correct returnHolderRatio`, async function () {
      const userHolderRatio = await contract.connect(alice).returnHolderRatio()
      const userBalance = await contract.balanceOf(alice.address)
      const holderWeight = await contract.holderWeight(alice.address)
      expect(userHolderRatio).to.equal(userBalance * holderWeight)
    })

    it(`should reflect correct adjustable weight on transfers`, async function () {
        await contract.connect(owner).transfer(bob.address, tokens(4))
        const bobWeight = await contract.holderWeight(bob.address)
        const adjustableWeight = await AdjustableWeight(owner.address, bob.address, tokens(4))
        expect(adjustableWeight).to.equal(bobWeight)
    })
  })
})
