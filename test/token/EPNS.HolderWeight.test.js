// Import helper functions
const { bn, tokensBN, bnToInt } = require('../../helpers/utils')

// We import Chai to use its asserting functions here.
const { expect } = require("chai")
const chalk = require("chalk")

require("@nomiclabs/hardhat-ethers")

describe("$PUSH Token ERC-20 Non Standard Test Cases", function () {
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

  describe('Reward Share Holder Weight', function () {
    it(`should have 'born' and 'holderWeight' to be initally same`, async function () {
      const holderWeight = await contract.holderWeight(owner.address)
      expect(await contract.born()).to.equal(holderWeight)
    })

    it(`should have 'born' as the block number of contract deploy`, async function () {
      expect(await contract.born()).to.equal(contract.deployTransaction.blockNumber)
    })

    it(`should have 'born' as the block number of contract deploy (randomized)`, async function () {
      const blocksRange = 100
      const random = Math.floor(Math.random() * blocksRange);

      for (var i=0; i < random; i++) {
        ethers.provider.send("evm_mine")
      }

      contract = await create()
      expect(await contract.born()).to.equal(contract.deployTransaction.blockNumber)
    })

    it(`should reflect accurate block number on transfer`, async function () {
      let blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokensBN(10))

      expect(await contract.holderWeight(alice.address)).to.equal(blockNumber)
    })

    it(`should reflect same block number on transfer back`, async function () {
      let blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokensBN(10))
      await contract.connect(alice).transfer(owner.address, tokensBN(10))

      expect(await contract.holderWeight(owner.address)).to.equal(blockNumber)
    })

    it(`should reflect same block number on multiple transfer`, async function () {
      const blockNumber = await ethers.provider.getBlockNumber()
      await contract.transfer(alice.address, tokensBN(1))

      // tx = mine block
      await contract.connect(alice).transfer(bob.address, tokensBN(1))

      // tx = mine block
      await contract.transfer(bob.address, tokensBN(1))
      expect(await contract.holderWeight(bob.address)).to.equal(blockNumber)
    })

    it(`should properly reflect adjusted weight on transfer after reset`, async function () {
      await contract.transfer(bob.address, tokensBN(1))
      await contract.connect(bob).resetHolderWeight(bob.address)

      await contract.transfer(bob.address, tokensBN(1))
      const ownerWeight = await contract.holderWeight(owner.address)

      expect(await contract.holderWeight(bob.address)).to.not.equal(ownerWeight)
    })

    it(`should adjust weight on reset for msg.sender`, async function () {
      await contract.transfer(alice.address, tokensBN(1))

      const tx = await contract.connect(alice).resetHolderWeight(alice.address)
      ethers.provider.send("evm_mine")
      expect(await contract.holderWeight(alice.address)).to.equal(tx.blockNumber)
    })

    it(`should adjust weight on reset for authorized delegator`, async function () {
      await contract.transfer(alice.address, tokensBN(1))
      await contract.connect(alice).setHolderDelegation(bob.address, true)

      const tx = await contract.connect(bob).resetHolderWeight(alice.address)
      ethers.provider.send("evm_mine")
      expect(await contract.holderWeight(alice.address)).to.equal(tx.blockNumber)
    })

    it(`should revert unauthorized delegator for adjust weight on reset`, async function () {
      await contract.transfer(alice.address, tokensBN(1))

      await expect(contract.resetHolderWeight(alice.address))
        .to.be.revertedWith('Push::resetHolderWeight: unauthorized')
    })

    it(`should return false for unauthorized delegator of holderWeight`, async function () {
      await contract.transfer(alice.address, tokensBN(1))

      expect (await contract.returnHolderDelegation(alice.address, bob.address)).to.equal(false)
    })

    it(`should return true for authorized delegator of holderWeight`, async function () {
      await contract.transfer(alice.address, tokensBN(1))

      await contract.connect(alice).setHolderDelegation(bob.address, true)
      expect (await contract.returnHolderDelegation(alice.address, bob.address)).to.equal(true)
    })

    it(`should revert on resetHolderWeight from external contract for unauthorized calls`, async function () {
      await contract.transfer(alice.address, tokensBN(100))

      const SimpleToken = await ethers.getContractFactory("SimpleToken")
      let simpleToken = await SimpleToken.deploy()

      const SimpleProtocol = await ethers.getContractFactory("SimpleProtocol")
      let simpleProtocol = await SimpleProtocol.deploy()

      // assign total supply to simpleToken address
      const total = await simpleToken.totalSupply()
      await simpleToken.transfer(simpleProtocol.address, total)

      await expect(simpleProtocol.connect(alice).claimReward(contract.address, simpleToken.address, tokensBN(1000)))
        .to.be.revertedWith('Push::resetHolderWeight: unauthorized')
    })

    it(`should handle resetHolderWeight from external contract for authorized calls`, async function () {
      await contract.transfer(alice.address, tokensBN(100))

      const SimpleToken = await ethers.getContractFactory("SimpleToken")
      let simpleToken = await SimpleToken.deploy()

      const SimpleProtocol = await ethers.getContractFactory("SimpleProtocol")
      let simpleProtocol = await SimpleProtocol.deploy()

      // assign total supply to simpleToken address
      const total = await simpleToken.totalSupply()
      await simpleToken.transfer(simpleProtocol.address, total)

      const l = await simpleToken.balanceOf(simpleToken.address)

      await contract.connect(alice).setHolderDelegation(simpleProtocol.address, true)
      const tx = await simpleProtocol.connect(alice).claimReward(contract.address, simpleToken.address, tokensBN(1000))

      const blocksRange = 100
      const random = Math.floor(Math.random() * blocksRange);

      for (var i=0; i < random; i++) {
        ethers.provider.send("evm_mine")
      }

      expect(await simpleToken.balanceOf(alice.address)).to.equal(tokensBN(1000))
      expect(await contract.holderWeight(alice.address)).to.equal(tx.blockNumber)
    })

    describe('Randomized Repeating tests', function () {
      const retries = 5
      for (var i=0; i < retries; i++) {
        const numTokensRange = 200
        const randTokens = Math.floor(Math.random() * numTokensRange)

        const blocksRange = 100
        const randomBlocks = Math.floor(Math.random() * blocksRange)

        it(`returnHolderUnits() should correctly calculate ratio [Tokens taken: ${randTokens} for ${randomBlocks} blocks]`, async function () {
          let bornBlock = await contract.born()

          await contract.transfer(alice.address, tokensBN(randTokens))
          const tx = await contract.connect(alice).resetHolderWeight(alice.address)

          const resetBlockNumber = tx.blockNumber

          let manualUnitCount = 0
          for (var i=0; i < randomBlocks; i++) {
            ethers.provider.send("evm_mine")
            manualUnitCount = manualUnitCount + randTokens
          }
          const currentBlockNumber = await ethers.provider.getBlockNumber()
          const diff = currentBlockNumber - resetBlockNumber

          const holderUnits = await contract.returnHolderUnits(alice.address, currentBlockNumber)
          expect(holderUnits).to.equal(tokensBN(manualUnitCount))

          console.log(chalk.grey(`\t --> Contract output for below test: ${holderUnits}`))
        })
      }
    })
  })
})
