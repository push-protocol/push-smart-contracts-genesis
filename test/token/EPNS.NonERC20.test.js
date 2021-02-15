// Import helper functions
const { expectRevertOrFail, bn } = require('../../helpers/helpers')

// We import Chai to use its asserting functions here.
const { expect } = require("chai")

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

      })

      describe('Fixed rewards, incremental rewards', function () {

      })

      describe('Fixed rewards, no incremental rewards', function () {

      })

      async function runTests(actualRewards, actualIncrementRewards, actualBlocks, actualUsers) {
        it(`should fairly distribute (${actualRewards} [+${actualIncrementRewards} per block] tokens in ${actualBlocks} blocks among ${actualUsers}[+1 owner] users)`, async function () {
          const signers = await ethers.getSigners(actualUsers + 1) // 0 is owner

          let setup = await setupInitialDistrubtion(signers, actualUsers, false, true) // signers, actualUsers, includeOwner, resetWeight
          await runInitialChecks(setup.users, setup.born) // run initial checks

          // setup rewards
          setup.rewards = actualRewards
          setup.rewardsIncrement = actualIncrementRewards

          const txs = await doTransferOrResetCalls(setup, actualUsers, actualBlocks, 2, 4) // transferChance 1 in 2, claimChance 1 in 4
          const users = txs.users
          const born = txs.born
          const snapshot = txs.snapshot
          const history = txs.history

          // run the tests

        })
      }

      async function setupInitialDistrubtion(signers, actualUsers, includeOwner, resetWeight) {
        let born = await contract.born()

        if (resetWeight) {
          await contract.resetHolderWeight()
          born = await contract.holderWeight(owner.address)
        }

        let users = []
        let totalTokenBalance = unitsToTokens(await contract.balanceOf(owner.address))

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

          const amount = tokens(totalTokenBalance.mul(allocation).div(100))

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

        return {
          users: users,
          born: born,
          snapshot: [],
          history: []
        }
      }

      async function runInitialChecks(users, born) {
        // 1.1 Distributed amount = Total supply
        let initialCheckTotalAmount = tokens(0)

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
            snapshot = await takeSnapshot(users, snapshot)

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
            await contract.connect(users[fromIndex]).resetHolderWeight()
            snapshot = await takeSnapshot(users, snapshot)

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

      async function takeSnapshot(users, ogSnapshot) {
        const blockNumber = await ethers.provider.getBlockNumber()
        let balances = {}

        balances.blockNumber = blockNumber
        for (const user of users) {
          const userBalance = await contract.balanceOf(user.address)
          const holderWeight = await contract.holderWeight(user.address)

          balances[user.address] = {
            balance: unitsToTokens(userBalance).toString(),
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
            senderBalance: unitsToTokens(senderBal).toString(),
            sentAmount: unitsToTokens(senderAmount).toString(),
            sentWeight: senderWeight.toString(),
            receiverOGBalance: unitsToTokens(receiverOGBal).toString(),
            receiverOGWeight: receiverOGWeight.toString(),
            receiverNewBalance: unitsToTokens(receiverNewBalance).toString(),
            receiverNewWeight: receiverNewWeight.toString(),
            calculated: (parseInt(unitsToTokens(senderAmount).toString()) * parseInt(senderWeight.toString()) + parseInt(unitsToTokens(receiverOGBal).toString()) * parseInt(receiverOGWeight.toString())) / (parseInt(unitsToTokens(senderAmount).toString()) + parseInt(unitsToTokens(receiverOGBal).toString())),
            op: operation
          })
        }
        else if (operation == "resetHolderWeight()") {
          ogHistory.push({
            fromBlock: blockNumber,
            user: users[fromIndex].address,
            userOldBalance: unitsToTokens(senderBal).toString(),
            userOldWeight: senderWeight.toString(),
            userNewBalance: unitsToTokens(receiverOGBal).toString(),
            userNewWeight: receiverOGWeight.toString(),
            op: operation
          })
        }

        return ogHistory
      }
    })

    // it(`as`, async function () {
    //
    // })
  })

  // describe('burn()', function () {
  //   it(`should be able to burn own tokens`, async function () {
  //     await contract.connect(owner).transfer(alice.address, tokens(1))
  //
  //     expect(await contract.connect(alice).burn(tokens(1)))
  //   })
  //
  //   it(`should be able to reduce token supply after burn`, async function () {
  //     await contract.connect(owner).transfer(alice.address, tokens(10))
  //     const supply1 = await contract.totalSupply()
  //
  //     await contract.connect(owner).burn(tokens(10))
  //     const supply2 = await contract.totalSupply()
  //
  //     expect(supply1.sub(tokens(10))).to.be.equal(supply2)
  //   })
  //
  //   it(`should not be able to burn more than balance`, async function () {
  //     await contract.transfer(alice.address, tokens(1))
  //
  //     await expect(contract.connect(alice).burn(tokens(2)))
  //       .to.be.revertedWith("Push::burn: burn amount exceeds balance")
  //   })
  //
  //   it(`should able to burn entire token supply`, async function () {
  //     await contract.transfer(alice.address, tokens(tokenInfo.supply))
  //
  //     expect(await contract.connect(alice).burn(tokens(tokenInfo.supply)))
  //   })
  //
  //   it(`should not be able to burn more than token supply`, async function () {
  //     await expect(contract.burn(tokens(tokenInfo.supply + 1)))
  //       .to.be.revertedWith("Push::burn: burn amount exceeds balance")
  //   })
  //
  //   it(`should be able to burn ${initialSupply.toString()}`, async function () {
  //     expect(await contract.totalSupply()).to.equal(initialSupply)
  //   })
  //
  //   describe('Randomized Repeating tests', function () {
  //     const retries = 5
  //
  //     for (var i=0; i < retries; i++) {
  //       const numOfDecimals = Math.floor(Math.random() * 3)
  //       const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply))
  //       const decimalShift = random / (10 ^ numOfDecimals)
  //
  //       it(`should be able to burn and reflect on token supply: (${decimalShift} tokens burn => ${tokenInfo.supply - decimalShift})`, async function () {
  //         const supply1 = await contract.totalSupply()
  //         const tokenAmount = bn(random, 0).mul(bn(10).pow(bn(tokenInfo.decimals - numOfDecimals)))
  //
  //         await contract.transfer(alice.address, tokenAmount)
  //         await contract.connect(alice).burn(tokenAmount)
  //
  //         const supply2 = await contract.totalSupply()
  //
  //         expect(supply1.sub(tokenAmount)).to.be.equal(supply2)
  //       })
  //     }
  //   })
  // })
  //
  // describe('permit()', function () {
  //   let contractName
  //   let spender
  //   let transmitter
  //   let tokenAmount
  //   let nonce
  //   let deadline
  //
  //   let domain
  //   let types
  //   let val
  //
  //   beforeEach(async function () {
  //     contract = await create()
  //     decimals = (contract.decimals ? await contract.decimals() : 0)
  //
  //     if (options.beforeEach) {
  //       await options.beforeEach(contract)
  //     }
  //
  //     contractName = await contract.name()
  //
  //     spender = alice
  //     transmitter = bob
  //     tokenAmount = tokens(232)
  //     nonce = await contract.nonces(owner.address)
  //     deadline = ethers.constants.MaxUint256
  //
  //     domain = {
  //       name: contractName,
  //       chainId: owner.provider._network.chainId,
  //       verifyingContract: contract.address.toString()
  //     }
  //
  //     types = {
  //       Permit: [
  //         {name: "owner", type: "address"},
  //         {name: "spender", type: "address"},
  //         {name: "value", type: "uint256"},
  //         {name: "nonce", type: "uint256"},
  //         {name: "deadline", type: "uint256"},
  //       ]
  //     }
  //
  //     val = {
  //       'owner': owner.address.toString(),
  //       'spender': spender.address.toString(),
  //       'value': tokenAmount.toString(),
  //       'nonce': nonce.toString(),
  //       'deadline': deadline.toString()
  //     }
  //
  //     // const typedData = {
  //     //   types: {
  //     //     EIP712Domain: [
  //     //       {name: "name", type: "string"},
  //     //       {name: "version", type: "string"},
  //     //       {name: "chainId", type: "uint256"},
  //     //       {name: "verifyingContract", type: "address"},
  //     //     ],
  //     //     Permit: [
  //     //       {name: "owner", type: "address"},
  //     //       {name: "spender", type: "address"},
  //     //       {name: "value", type: "uint256"},
  //     //       {name: "nonce", type: "uint256"},
  //     //       {name: "deadline", type: "uint256"},
  //     //     ]
  //     //   },
  //     //   primaryType: 'Permit',
  //     //   domain: {
  //     //     name: contractName,
  //     //     version: '1',
  //     //     chainId: owner.provider._network.chainId,
  //     //     verifyingContract: contract.address.toString()
  //     //   },
  //     //   message: {
  //     //     'owner': owner.address.toString(),
  //     //     'spender': spender.address.toString(),
  //     //     'value': tokenAmount.toString(),
  //     //     'nonce': nonce.toString(),
  //     //     'deadline': deadline.toString()
  //     //   }
  //     // }
  //   })
  //
  //   afterEach(async function () {
  //     if (options.afterEach) {
  //       await options.afterEach(contract)
  //     }
  //     contract = null
  //     decimals = 0
  //   })
  //
  //   it('should abort on unauthorized request', async function () {
  //     const signer = ethers.provider.getSigner(1) // owner is 0 and should be the signer
  //     const signature = await signer._signTypedData(domain, types, val)
  //     let sig = ethers.utils.splitSignature(signature)
  //
  //     await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
  //       .to.be.revertedWith('Push::permit: unauthorized')
  //   })
  //
  //   it('should abort on invalid nonce', async function () {
  //     nonce = await contract.nonces(owner.address) + 1
  //     val['nonce'] = nonce.toString()
  //
  //     const signer = ethers.provider.getSigner(0) // owner is 0 and should be the signer
  //     const signature = await signer._signTypedData(domain, types, val)
  //     let sig = ethers.utils.splitSignature(signature)
  //
  //     await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
  //       .to.be.revertedWith('Push::permit: unauthorized')
  //   })
  //
  //   it('should abort on deadline expiry', async function () {
  //     const now = new Date()
  //     const secondsSinceEpoch = Math.round(now.getTime() / 1000)
  //
  //     deadline = secondsSinceEpoch - 10000
  //     val['deadline'] = deadline.toString()
  //
  //     const signer = ethers.provider.getSigner(0)
  //     const signature = await signer._signTypedData(domain, types, val)
  //     let sig = ethers.utils.splitSignature(signature)
  //
  //     await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
  //       .to.be.revertedWith('Push::permit: signature expired')
  //   })
  //
  //   it('should permit if within deadline', async function () {
  //     const now = new Date()
  //     const secondsSinceEpoch = Math.round(now.getTime() / 1000)
  //
  //     deadline = secondsSinceEpoch + 10000;
  //     val['deadline'] = deadline.toString()
  //
  //     const signer = ethers.provider.getSigner(0)
  //     const signature = await signer._signTypedData(domain, types, val)
  //     let sig = ethers.utils.splitSignature(signature)
  //
  //     expect(await contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
  //   })
  //
  //   it('should permit and transfer', async function () {
  //     const signer = ethers.provider.getSigner(0)
  //     const signature = await signer._signTypedData(domain, types, val)
  //     let sig = ethers.utils.splitSignature(signature)
  //
  //     await expect(contract.connect(spender).transferFrom(owner.address, transmitter.address, tokenAmount))
  //       .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
  //
  //     await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
  //       .to.emit(contract, 'Approval')
  //       .withArgs(owner.address, spender.address, tokenAmount)
  //
  //     expect(await contract.allowance(owner.address, spender.address)).to.be.equal(tokenAmount)
  //     expect(await contract.nonces(owner.address)).to.be.equal(1)
  //
  //     await contract.connect(spender).transferFrom(owner.address, transmitter.address, tokenAmount)
  //   })
  // })
  //
  // describe('Governance', function() {
  //   let contractName
  //   let signatory
  //   let delegatee
  //   let transmitter
  //   let nonce
  //   let expiry
  //
  //   let domain
  //   let types
  //   let val
  //
  //   beforeEach(async function () {
  //     contract = await create()
  //     decimals = (contract.decimals ? await contract.decimals() : 0)
  //
  //     if (options.beforeEach) {
  //       await options.beforeEach(contract)
  //     }
  //
  //     contractName = await contract.name()
  //
  //     signatory = owner
  //     delegatee = alice
  //     transmitter = bob
  //     nonce = await contract.nonces(delegatee.address)
  //     expiry = ethers.constants.MaxUint256
  //
  //     domain = {
  //       name: contractName,
  //       chainId: owner.provider._network.chainId,
  //       verifyingContract: contract.address.toString()
  //     }
  //
  //     types = {
  //       Delegation: [
  //         {name: "delegatee", type: "address"},
  //         {name: "nonce", type: "uint256"},
  //         {name: "expiry", type: "uint256"},
  //       ]
  //     }
  //
  //     val = {
  //       'delegatee': delegatee.address.toString(),
  //       'nonce': nonce.toString(),
  //       'expiry': expiry.toString()
  //     }
  //   })
  //
  //   afterEach(async function () {
  //     if (options.afterEach) {
  //       await options.afterEach(contract)
  //     }
  //     contract = null
  //     decimals = 0
  //   })
  //
  //   describe('delegateBySig()', () => {
  //     it('should revert on invalid signature', async () => {
  //       const signer = ethers.provider.getSigner(0)
  //       const signature = await signer._signTypedData(domain, types, val)
  //       let sig = ethers.utils.splitSignature(signature)
  //       sig.v = 0
  //       sig.r = '0xbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad0'
  //       sig.s = '0xbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad0'
  //
  //       await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
  //         .to.be.revertedWith('Push::delegateBySig: invalid signature')
  //     })
  //
  //     it('should revert on invalid nonce', async () => {
  //       nonce = 100
  //       val['nonce'] = nonce.toString()
  //
  //       const signer = ethers.provider.getSigner(0)
  //       const signature = await signer._signTypedData(domain, types, val)
  //       let sig = ethers.utils.splitSignature(signature)
  //
  //       await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
  //         .to.be.revertedWith('Push::delegateBySig: invalid nonce')
  //     })
  //
  //     it('should revert if signature has expired', async () => {
  //       const now = new Date()
  //       const secondsSinceEpoch = Math.round(now.getTime() / 1000)
  //
  //       expiry = secondsSinceEpoch - 10000
  //       val['expiry'] = expiry.toString()
  //
  //       const signer = ethers.provider.getSigner(0)
  //       const signature = await signer._signTypedData(domain, types, val)
  //       let sig = ethers.utils.splitSignature(signature)
  //
  //       await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
  //         .to.be.revertedWith('Push::delegateBySig: signature expired')
  //     })
  //
  //     it('should delegate on behalf of signatory', async () => {
  //       const signer = ethers.provider.getSigner(0)
  //       const signature = await signer._signTypedData(domain, types, val)
  //       let sig = ethers.utils.splitSignature(signature)
  //
  //       expect(await contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
  //     })
  //
  //     it('should emit when delegated', async () => {
  //       const signer = ethers.provider.getSigner(0)
  //       const signature = await signer._signTypedData(domain, types, val)
  //       let sig = ethers.utils.splitSignature(signature)
  //
  //       await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
  //         .to.emit(contract, 'DelegateChanged')
  //         .withArgs(owner.address, '0x0000000000000000000000000000000000000000', delegatee.address);
  //     })
  //   })
  //
  //   describe('numCheckpoints()', () => {
  //     it('should return correctly the number of checkpoints for a delegate', async () => {
  //       await contract.transfer(alice.address, tokens(100))
  //       expect(await contract.numCheckpoints(bob.address)).to.equal(0)
  //
  //       const t1 = await contract.connect(alice).delegate(bob.address)
  //       expect(await contract.numCheckpoints(bob.address)).to.equal(1)
  //
  //       const t2 = await contract.connect(alice).transfer(charles.address, tokens(10))
  //       expect(await contract.numCheckpoints(bob.address)).to.equal(2)
  //
  //       const t3 = await contract.connect(alice).transfer(charles.address, tokens(10))
  //       expect(await contract.numCheckpoints(bob.address)).to.equal(3)
  //
  //       const t4 = await contract.transfer(alice.address, tokens(20))
  //       expect(await contract.numCheckpoints(bob.address)).to.equal(4)
  //
  //       const obj1 = await contract.checkpoints(bob.address, 0)
  //       expect (obj1.votes).to.equal(tokens(100))
  //       expect (obj1.fromBlock).to.equal(t1.blockNumber)
  //
  //       const obj2 = await contract.checkpoints(bob.address, 1)
  //       expect (obj2.votes).to.equal(tokens(90))
  //       expect (obj2.fromBlock).to.equal(t2.blockNumber)
  //
  //       const obj3 = await contract.checkpoints(bob.address, 2)
  //       expect (obj3.votes).to.equal(tokens(80))
  //       expect (obj3.fromBlock).to.equal(t3.blockNumber)
  //
  //       const obj4 = await contract.checkpoints(bob.address, 3)
  //       expect (obj4.votes).to.equal(tokens(100))
  //       expect (obj4.fromBlock).to.equal(t4.blockNumber)
  //     })
  //
  //     // NOT SUPPORTED IN HARDHAT (MINER_STOP / MINER_START)
  //     // it('should not add more than one checkpoint in a block', async () => {
  //     //   await contract.transfer(alice.address, tokens(100))
  //     //   expect(await contract.numCheckpoints(bob.address)).to.equal(0)
  //     //
  //     //   ethers.provider.send("miner_stop")
  //     //
  //     //   let t1 = await contract.connect(alice).delegate(bob.address)
  //     //   let t2 = await contract.connect(alice).transfer(charles.address, tokens(10))
  //     //   let t3 = await contract.connect(alice).transfer(charles.address, tokens(10))
  //     //
  //     //   ethers.provider.send("miner_start")
  //     //
  //     //   t1 = await t1;
  //     //   t2 = await t2;
  //     //   t3 = await t3;
  //     //
  //     //   expect(await contract.numCheckpoints(bob.address)).to.equal(3)
  //     //
  //     //   const obj1 = await contract.checkpoints(bob.address, 0)
  //     //   expect (obj1.votes).to.equal(tokens(100))
  //     // })
  //   })
  //
  //   describe('getPriorVotes()', () => {
  //     it('should revert if block number >= current block', async () => {
  //       let blockNumber = await ethers.provider.getBlockNumber()
  //       await expect(contract.getPriorVotes(alice.address, blockNumber + 1))
  //         .to.be.revertedWith('Push::getPriorVotes: not yet determined')
  //     })
  //
  //     it('should return 0 when no checkpoints are present', async () => {
  //       await expect(await contract.getPriorVotes(alice.address, 0)).to.equal(0)
  //     })
  //
  //     it('should return the latest block if >= last checkpoint block', async () => {
  //       const tx = await contract.connect(signatory).delegate(delegatee.address)
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 1)).to.equal('0')
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber)).to.equal(initialSupply)
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber + 1)).to.equal(initialSupply)
  //     })
  //
  //     it('should return zero if < first checkpoint block', async () => {
  //       const tx = await contract.connect(signatory).delegate(delegatee.address)
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber)).to.equal(initialSupply)
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 1)).to.equal('0')
  //       await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 10)).to.equal('0')
  //     })
  //
  //     it('should return and adjust appropriate voting balance', async () => {
  //       const t1 = await contract.connect(signatory).delegate(delegatee.address)
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       const t2 = await contract.connect(signatory).transfer(transmitter.address, tokens(10))
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       const t3 = await contract.connect(signatory).transfer(transmitter.address, tokens(10))
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       const t4 = await contract.connect(transmitter).transfer(signatory.address, tokens(20))
  //       ethers.provider.send("evm_mine")
  //       ethers.provider.send("evm_mine")
  //
  //       await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber - 1)).to.equal('0')
  //       await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber)).to.equal(initialSupply)
  //       await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber + 1)).to.equal(initialSupply)
  //       await expect(await contract.getPriorVotes(delegatee.address, t2.blockNumber)).to.equal(initialSupply.sub(tokens(10)))
  //       await expect(await contract.getPriorVotes(delegatee.address, t2.blockNumber + 1)).to.equal(initialSupply.sub(tokens(10)))
  //       await expect(await contract.getPriorVotes(delegatee.address, t3.blockNumber)).to.equal(initialSupply.sub(tokens(20)))
  //       await expect(await contract.getPriorVotes(delegatee.address, t3.blockNumber + 1)).to.equal(initialSupply.sub(tokens(20)))
  //       await expect(await contract.getPriorVotes(delegatee.address, t4.blockNumber)).to.equal(initialSupply)
  //       await expect(await contract.getPriorVotes(delegatee.address, t4.blockNumber + 1)).to.equal(initialSupply)
  //     })
  //   })
  // })

})
