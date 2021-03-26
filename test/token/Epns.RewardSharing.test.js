// Import helper functions
// const { bn } = require('../../helpers/helpers')
const { bn, tokensBN, bnToInt, returnWeight } = require('../../helpers/utils')

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

      const tx = await contract.connect(alice).resetHolderWeight(alice.address)
      ethers.provider.send("evm_mine")
      expect(await contract.holderWeight(alice.address)).to.equal(tx.blockNumber)
    })

    it(`should properly reflect adjusted weight on transfer after reset`, async function () {
      await contract.transfer(bob.address, tokens(1))
      await contract.connect(bob).resetHolderWeight(bob.address)

      await contract.transfer(bob.address, tokens(1))
      const ownerWeight = await contract.holderWeight(owner.address)

      expect(await contract.holderWeight(bob.address)).to.not.equal(ownerWeight)
    })

    it(`should reflect correct returnHolderRatio`, async function () {
      const blockNumber = await ethers.provider.getBlockNumber()

      const userHolderUnits = await contract.returnHolderUnits(alice.address, blockNumber)

      const userBalance = await contract.balanceOf(alice.address)
      const holderWeight = await contract.holderWeight(alice.address)
      const born = await contract.born()

      expect(userHolderUnits).to.equal(userBalance * (holderWeight - born))
    })

    it(`should reflect correct adjustable weight on transfers`, async function () {
        await contract.connect(owner).transfer(bob.address, tokens(4))
        const bobWeight = await contract.holderWeight(bob.address)
        const adjustableWeight = await AdjustableWeight(owner.address, bob.address, tokens(4))
        expect(adjustableWeight).to.equal(bobWeight)
    })
  })

  describe('Randomized Repeating tests', function () {
      describe('Random rewards, No incremental rewards', function () {
        // test reward split multiple times with multiple transfers and holder weights
        const retries = 1

        const minRewardTokens = 100 // amount of min reward to be distributed
        const maxRewardTokens = 1000 // amount of max reward to be distributed

        const minIncementRewardToken = 0 // amount of reward increment
        const maxIncementRewardToken = 0 // amount of reward increment

        const numBlocks = 100 // amount of blocks getting moved
        const minUsers = 2 // amount of participants in the reward pool
        const maxUsers = 3 // amount of participants in the reward pool

        for (var i=0; i < retries; i++) {
          const actualRewards = minRewardTokens + Math.floor(Math.random() * Math.floor(maxRewardTokens - minRewardTokens + 1))
          const actualIncrementRewards = minIncementRewardToken + Math.floor(Math.random() * Math.floor(maxIncementRewardToken - minIncementRewardToken + 1))

          const actualBlocks = Math.floor(Math.random() * Math.floor(numBlocks)) + 1
          const actualUsers = minUsers + Math.floor(Math.random() * Math.floor(maxUsers - minUsers + 1))

          runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers)
        }
      })

      describe('Random rewards, incremental rewards', function () {
        const retries = 1

        const minRewardTokens = 100 // amount of min reward to be distributed
        const maxRewardTokens = 1000 // amount of max reward to be distributed

        const minIncementRewardToken = 1 // amount of reward increment
        const maxIncementRewardToken = 10 // amount of reward increment

        const numBlocks = 100 // amount of blocks getting moved
        const minUsers = 2 // amount of participants in the reward pool
        const maxUsers = 3 // amount of participants in the reward pool

        for (var i=0; i < retries; i++) {
          const actualRewards = minRewardTokens + Math.floor(Math.random() * Math.floor(maxRewardTokens - minRewardTokens + 1))
          const actualIncrementRewards = minIncementRewardToken + Math.floor(Math.random() * Math.floor(maxIncementRewardToken - minIncementRewardToken + 1))

          const actualBlocks = Math.floor(Math.random() * Math.floor(numBlocks)) + 1
          const actualUsers = minUsers + Math.floor(Math.random() * Math.floor(maxUsers - minUsers + 1))

          runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers)
        }
      })

      describe('Fixed rewards, incremental rewards', function () {
        const retries = 1

        const minRewardTokens = 0 // amount of min reward to be distributed
        const maxRewardTokens = 0 // amount of max reward to be distributed

        const minIncementRewardToken = 1 // amount of reward increment
        const maxIncementRewardToken = 10 // amount of reward increment

        const numBlocks = 100 // amount of blocks getting moved
        const minUsers = 2 // amount of participants in the reward pool
        const maxUsers = 3 // amount of participants in the reward pool

        for (var i=0; i < retries; i++) {
          const actualRewards = minRewardTokens + Math.floor(Math.random() * Math.floor(maxRewardTokens - minRewardTokens + 1))
          const actualIncrementRewards = minIncementRewardToken + Math.floor(Math.random() * Math.floor(maxIncementRewardToken - minIncementRewardToken + 1))

          const actualBlocks = Math.floor(Math.random() * Math.floor(numBlocks)) + 1
          const actualUsers = minUsers + Math.floor(Math.random() * Math.floor(maxUsers - minUsers + 1))

          runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers)
        }
      })

      describe('Fixed rewards, no incremental rewards', function () {
        const retries = 1

        const minRewardTokens = 0 // amount of min reward to be distributed
        const maxRewardTokens = 0 // amount of max reward to be distributed

        const minIncementRewardToken = 0 // amount of reward increment
        const maxIncementRewardToken = 0 // amount of reward increment

        const numBlocks = 100 // amount of blocks getting moved
        const minUsers = 2 // amount of participants in the reward pool
        const maxUsers = 3 // amount of participants in the reward pool

        for (var i=0; i < retries; i++) {
          const actualRewards = minRewardTokens + Math.floor(Math.random() * Math.floor(maxRewardTokens - minRewardTokens + 1))
          const actualIncrementRewards = minIncementRewardToken + Math.floor(Math.random() * Math.floor(maxIncementRewardToken - minIncementRewardToken + 1))

          const actualBlocks = Math.floor(Math.random() * Math.floor(numBlocks)) + 1
          const actualUsers = minUsers + Math.floor(Math.random() * Math.floor(maxUsers - minUsers + 1))

          runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers)
        }
      })

      async function runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers) {
        it(`should fairly distribute (${actualRewards} [+${actualIncrementRewards} per block] tokens in ${actualBlocks} blocks among ${actualUsers}[+1 owner] users)`, async function () {
          const signers = await ethers.getSigners(actualUsers + 1) // 0 is owner

          let setup = await setupInitialDistrubtion(signers, actualUsers, false, true) // signers, actualUsers, includeOwner, resetWeight
          await runInitialChecks(setup.users, setup.born) // run initial checks
          // setup rewards
          setup.rewards = actualRewards
          setup.rewardsIncrement = actualIncrementRewards

          // take history snapshot


          const txs = await doTransferOrResetCalls(setup, actualUsers, actualBlocks, 2, 4) // transferChance 1 in 2, claimChance 1 in 4
          const users = txs.users
          const born = txs.born
          const snapshot = txs.snapshot
          // const history = txs.history
          console.log("txs.history: ", txs.history.length)

          // run the tests
          for (let index = 0; index < txs.history.length; index++) {
            const history = txs.history[index];
            // sourceWeight, destBal, destWeight, amount
            if (history.op == 'transfer()') {
              const { holderWeight, totalAmount } = returnWeight(history.sentWeight, history.receiverOGBalance, history.receiverOGWeight, history.sentAmount, history.fromBlock, "transfer")
              // console.log({holderWeight: holderWeight.toString(), totalAmount: totalAmount.toString(), receiverNewBalance: history.receiverNewBalance.toString(), receiverNewWeight: history.receiverNewWeight.toString(), op: 'transfer()'})
              expect(holderWeight.toString()).to.equal(history.receiverNewWeight.toString())
              expect(totalAmount.toString()).to.oneOf([history.receiverNewBalance.toString(), bn(history.receiverNewBalance).sub(bn(1)).toString()])
            } else {
              const { holderWeight, totalAmount } = returnWeight(history.userOldWeight, history.userOldBalance, history.userOldWeight, 0, history.fromBlock, "resetHolderWeight")
              // console.log({holderWeight: holderWeight.toString(), totalAmount: totalAmount.toString(), receiverNewBalance: history.userNewBalance.toString(), receiverNewWeight: history.userNewWeight.toString(), op: 'resetHolderWeight()'})
              expect(holderWeight.toString()).to.equal(history.userNewWeight.toString())
              expect(totalAmount.toString()).to.oneOf([history.userNewBalance.toString(), bn(history.userNewBalance).sub(bn(1)).toString()])
            }
          }
        })
      }

      async function setupInitialDistrubtion(signers, actualUsers, includeOwner, resetWeight) {
        let born = await contract.born()
        let snapshot = []

        if (resetWeight) {
          await contract.resetHolderWeight(owner.address)
          born = await contract.holderWeight(owner.address)
        }

        let users = []
        let totalTokenBalance = bnToInt(await contract.balanceOf(owner.address))

        // First randomize transfer of tokens from owner to all users
        let tokenPerc = 100
        let allocated = 0
        let countdown = 0

        if (!includeOwner) countdown = 1

        for (var i = actualUsers; i >= countdown; i--) {
          users[i] = {} // initialize users first

          let allocation = Math.floor((Math.random() * tokenPerc))
          tokenPerc = tokenPerc - allocation

          if (i != countdown) {
            allocated = allocated + allocation
          }

          if (includeOwner && i == countdown) {
            allocation = 100 - allocated
          }

          const amount = tokensBN(totalTokenBalance.mul(allocation).div(100))

          await contract.transfer(signers[i].address, amount)

          users[i] = signers[i]
          users[i].initialAmt = amount
          users[i].initialWeight = await contract.holderWeight(signers[i].address)
        }

        if(!includeOwner) {
          users[0] = {} // initialize users first

          users[0] = signers[0]
          users[0].initialAmt = await contract.balanceOf(signers[0].address)
          users[0].initialWeight = await contract.holderWeight(signers[0].address)
        }

        // take first snapshot
        snapshot = await takeSnapshot(users, snapshot, born)

        return {
          users: users,
          born: born,
          snapshot: snapshot,
          history: []
        }
      }

      async function runInitialChecks(users, born) {
        // 1.1 Distributed amount = Total supply
        let initialCheckTotalAmount = tokensBN(0)

        for (const user of users) {
          initialCheckTotalAmount = initialCheckTotalAmount.add(user.initialAmt)
        }
        expect(await contract.totalSupply()).to.equal(initialCheckTotalAmount)

        // 1.2 born = initial weight
        for (const user of users) {
          expect(await contract.holderWeight(user.address)).to.equal(born)
        }
      }

      async function doTransferOrResetCalls(setup, actualUsers, numBlocks, transferChance, claimChance) {
        let users = setup.users
        let born = setup.born
        let snapshot = setup.snapshot
        let history = setup.history

        let totalRewardsDistribute = 0
        let rewardsAvailable = setup.rewardsAvailable

        const blocks = numBlocks;
        const bornTime = Number(born.toString())
        const totalTokens = bn(await contract.balanceOf(users[0].address)).mul((await contract.holderWeight(users[0].address))).toString()
        const initial = {}
        let totalTotal = 0;
        for (let index = 0; index < users.length; index++) {
          const user = users[index];
          const balance = (await contract.balanceOf(user.address)).toString()
          const weight = (await contract.holderWeight(user.address)).toString()
          initial[user.address] = { balance, weight, total: bn(balance).mul(weight).toString() }
          totalTotal = bn(totalTotal).add(bn(balance).mul(weight))
        }

        // console.log({blocks, bornTime, totalTokens, actualUsers, transferChance, claimChance, initial, totalTotal: totalTotal.toString()})
        for (var i=0; i < numBlocks; i++) {
          ethers.provider.send("evm_mine")

          // chance of transfer
          const shouldTransfer = Math.floor(Math.random() * transferChance)

          if (shouldTransfer == 0) {
            // Randomize users
            const fromIndex = Math.floor(Math.random() * actualUsers) + 1 // emit owner
            let toIndex = fromIndex
            while (toIndex == fromIndex) {
              toIndex = Math.floor(Math.random() * actualUsers) + 1 // emit owner
            }

            const tokenPerc = Math.floor((Math.random() * 100))

            const fromBalance = await contract.balanceOf(users[fromIndex].address)
            const fromAmount = fromBalance.mul(tokenPerc).div(100)
            const fromWeight = await contract.holderWeight(users[fromIndex].address)

            const toAmount = await contract.balanceOf(users[toIndex].address)
            const toWeight = await contract.holderWeight(users[toIndex].address)
    

            await contract.connect(users[fromIndex]).transfer(users[toIndex].address, fromAmount)
            snapshot = await takeSnapshot(users, snapshot, false)

            // record it for history
            history = await recordHistory(
              users,
              fromIndex,
              toIndex,
              fromBalance,
              fromWeight,
              fromAmount,
              toAmount,
              toWeight,
              `transfer()`,
              history
            )
          }

          // chance of claiming rewards from random user
          const shouldClaim = Math.floor(Math.random() * claimChance)
          if (shouldClaim == 0) {
            // Randomize users
            const fromIndex = Math.floor(Math.random() * actualUsers) + 1 // emit owner
            const fromBalance = await contract.balanceOf(users[fromIndex].address)
            const fromWeight = await contract.holderWeight(users[fromIndex].address)

            // reset holder
            await contract.connect(users[fromIndex]).resetHolderWeight(users[fromIndex].address)
            snapshot = await takeSnapshot(users, snapshot, false)

            const toBalance = await contract.balanceOf(users[fromIndex].address)
            const toWeight = await contract.holderWeight(users[fromIndex].address)

            // record it for history
            history = await recordHistory(
              users,
              fromIndex,
              -1,
              fromBalance,
              fromWeight,
              -1,
              toBalance,
              toWeight,
              `resetHolderWeight()`,
              history
            )
          }
        }

        return {
          users: users,
          born: born,
          snapshot: snapshot,
          history: history
        }
      }

      async function takeSnapshot(users, ogSnapshot, overrideBlock) {
        const blockNumber = await ethers.provider.getBlockNumber()
        let balances = {}

        balances.blockNumber = blockNumber
        if (overrideBlock) {
          balances.blockNumber = overrideBlock
        }
        for (const user of users) {
          const userBalance = await contract.balanceOf(user.address)
          const holderWeight = await contract.holderWeight(user.address)

          balances[user.address] = {
            balance: bnToInt(userBalance).toString(),
            weight: holderWeight.toString()
          }
        }

        ogSnapshot.push(balances)
        return ogSnapshot
      }

      async function recordHistory(
        users,
        fromIndex,
        toIndex,
        senderBal,
        senderWeight,
        senderAmount,
        receiverOGBal,
        receiverOGWeight,
        operation,
        ogHistory
      ) {
        const blockNumber = await ethers.provider.getBlockNumber()

        if (operation == "transfer()") {
          const receiverNewBalance = await contract.balanceOf(users[toIndex].address)
          const receiverNewWeight = await contract.holderWeight(users[toIndex].address)

          ogHistory.push({
            fromBlock: blockNumber,
            to: users[toIndex].address,
            from: users[fromIndex].address,
            senderBalance: bnToInt(senderBal).toString(),
            sentAmount: bnToInt(senderAmount).toString(),
            sentWeight: senderWeight.toString(),
            receiverOGBalance: bnToInt(receiverOGBal).toString(),
            receiverOGWeight: receiverOGWeight.toString(),
            receiverNewBalance: bnToInt(receiverNewBalance).toString(),
            receiverNewWeight: receiverNewWeight.toString(),
            calculated: (parseInt(bnToInt(senderAmount).toString()) * parseInt(senderWeight.toString()) + parseInt(bnToInt(receiverOGBal).toString()) * parseInt(receiverOGWeight.toString())) / (parseInt(bnToInt(senderAmount).toString()) + parseInt(bnToInt(receiverOGBal).toString())),
            op: operation
          })
        }
        else if (operation == "resetHolderWeight()") {
          ogHistory.push({
            fromBlock: blockNumber,
            user: users[fromIndex].address,
            userOldBalance: bnToInt(senderBal).toString(),
            userOldWeight: senderWeight.toString(),
            userNewBalance: bnToInt(receiverOGBal).toString(),
            userNewWeight: receiverOGWeight.toString(),
            op: operation
          })
        }

        return ogHistory
      }
    })

    it(`as`, async function () {

    })
})
