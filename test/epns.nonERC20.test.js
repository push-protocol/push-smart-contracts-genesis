// Import helper functions
const { expectRevertOrFail, bn } = require('../helpers/helpers')

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

  describe('burn()', function () {
    it(`should be able to burn own tokens`, async function () {
      await contract.connect(owner).transfer(alice.address, tokens(1))

      expect(await contract.connect(alice).burn(tokens(1)))
    })

    it(`should be able to reduce token supply after burn`, async function () {
      await contract.connect(owner).transfer(alice.address, tokens(10))
      const supply1 = await contract.totalSupply()

      await contract.connect(owner).burn(tokens(10))
      const supply2 = await contract.totalSupply()

      expect(supply1.sub(tokens(10))).to.be.equal(supply2)
    })

    it(`should not be able to burn more than balance`, async function () {
      await contract.transfer(alice.address, tokens(1))

      await expect(contract.connect(alice).burn(tokens(2)))
        .to.be.revertedWith("Push::burn: burn amount exceeds balance")
    })

    it(`should able to burn entire token supply`, async function () {
      await contract.transfer(alice.address, tokens(tokenInfo.supply))

      expect(await contract.connect(alice).burn(tokens(tokenInfo.supply)))
    })

    it(`should not be able to burn more than token supply`, async function () {
      await expect(contract.burn(tokens(tokenInfo.supply + 1)))
        .to.be.revertedWith("Push::burn: burn amount exceeds balance")
    })

    it(`should be able to burn ${initialSupply.toString()}`, async function () {
      expect(await contract.totalSupply()).to.equal(initialSupply)
    })

    describe('Randomized Repeating tests', function () {
      const retries = 5

      for (var i=0; i < retries; i++) {
        const numOfDecimals = Math.floor(Math.random() * 3)
        const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply))
        const decimalShift = random / (10 ^ numOfDecimals)

        it(`should be able to burn and reflect on token supply: (${decimalShift} tokens burn => ${tokenInfo.supply - decimalShift})`, async function () {
          const supply1 = await contract.totalSupply()
          const tokenAmount = bn(random, 0).mul(bn(10).pow(bn(tokenInfo.decimals - numOfDecimals)))

          await contract.transfer(alice.address, tokenAmount)
          await contract.connect(alice).burn(tokenAmount)

          const supply2 = await contract.totalSupply()

          expect(supply1.sub(tokenAmount)).to.be.equal(supply2)
        })
      }
    })
  })

  describe('permit()', function () {
    let contractName
    let spender
    let transmitter
    let tokenAmount
    let nonce
    let deadline

    let domain
    let types
    let val

    beforeEach(async function () {
      contract = await create()
      decimals = (contract.decimals ? await contract.decimals() : 0)

      if (options.beforeEach) {
        await options.beforeEach(contract)
      }

      contractName = await contract.name()

      spender = alice
      transmitter = bob
      tokenAmount = tokens(232)
      nonce = await contract.nonces(owner.address)
      deadline = ethers.constants.MaxUint256

      domain = {
        name: contractName,
        chainId: owner.provider._network.chainId,
        verifyingContract: contract.address.toString()
      }

      types = {
        Permit: [
          {name: "owner", type: "address"},
          {name: "spender", type: "address"},
          {name: "value", type: "uint256"},
          {name: "nonce", type: "uint256"},
          {name: "deadline", type: "uint256"},
        ]
      }

      val = {
        'owner': owner.address.toString(),
        'spender': spender.address.toString(),
        'value': tokenAmount.toString(),
        'nonce': nonce.toString(),
        'deadline': deadline.toString()
      }

      // const typedData = {
      //   types: {
      //     EIP712Domain: [
      //       {name: "name", type: "string"},
      //       {name: "version", type: "string"},
      //       {name: "chainId", type: "uint256"},
      //       {name: "verifyingContract", type: "address"},
      //     ],
      //     Permit: [
      //       {name: "owner", type: "address"},
      //       {name: "spender", type: "address"},
      //       {name: "value", type: "uint256"},
      //       {name: "nonce", type: "uint256"},
      //       {name: "deadline", type: "uint256"},
      //     ]
      //   },
      //   primaryType: 'Permit',
      //   domain: {
      //     name: contractName,
      //     version: '1',
      //     chainId: owner.provider._network.chainId,
      //     verifyingContract: contract.address.toString()
      //   },
      //   message: {
      //     'owner': owner.address.toString(),
      //     'spender': spender.address.toString(),
      //     'value': tokenAmount.toString(),
      //     'nonce': nonce.toString(),
      //     'deadline': deadline.toString()
      //   }
      // }
    })

    afterEach(async function () {
      if (options.afterEach) {
        await options.afterEach(contract)
      }
      contract = null
      decimals = 0
    })

    it('should abort on unauthorized request', async function () {
      const signer = ethers.provider.getSigner(1) // owner is 0 and should be the signer
      const signature = await signer._signTypedData(domain, types, val)
      let sig = ethers.utils.splitSignature(signature)

      await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWith('Push::permit: unauthorized')
    })

    it('should abort on invalid nonce', async function () {
      nonce = await contract.nonces(owner.address) + 1
      val['nonce'] = nonce.toString()

      const signer = ethers.provider.getSigner(0) // owner is 0 and should be the signer
      const signature = await signer._signTypedData(domain, types, val)
      let sig = ethers.utils.splitSignature(signature)

      await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWith('Push::permit: unauthorized')
    })

    it('should abort on deadline expiry', async function () {
      const now = new Date()
      const secondsSinceEpoch = Math.round(now.getTime() / 1000)

      deadline = secondsSinceEpoch - 10000
      val['deadline'] = deadline.toString()

      const signer = ethers.provider.getSigner(0)
      const signature = await signer._signTypedData(domain, types, val)
      let sig = ethers.utils.splitSignature(signature)

      await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWith('Push::permit: signature expired')
    })

    it('should permit if within deadline', async function () {
      const now = new Date()
      const secondsSinceEpoch = Math.round(now.getTime() / 1000)

      deadline = secondsSinceEpoch + 10000;
      val['deadline'] = deadline.toString()

      const signer = ethers.provider.getSigner(0)
      const signature = await signer._signTypedData(domain, types, val)
      let sig = ethers.utils.splitSignature(signature)

      expect(await contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
    })

    it('should permit and transfer', async function () {
      const signer = ethers.provider.getSigner(0)
      const signature = await signer._signTypedData(domain, types, val)
      let sig = ethers.utils.splitSignature(signature)

      await expect(contract.connect(spender).transferFrom(owner.address, transmitter.address, tokenAmount))
        .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

      await expect(contract.connect(transmitter).permit(owner.address, spender.address, tokenAmount, deadline, sig.v, sig.r, sig.s))
        .to.emit(contract, 'Approval')
        .withArgs(owner.address, spender.address, tokenAmount)

      expect(await contract.allowance(owner.address, spender.address)).to.be.equal(tokenAmount)
      expect(await contract.nonces(owner.address)).to.be.equal(1)

      await contract.connect(spender).transferFrom(owner.address, transmitter.address, tokenAmount)
    })
  })

  describe('Governance', function() {
    let contractName
    let signatory
    let delegatee
    let transmitter
    let nonce
    let expiry

    let domain
    let types
    let val

    beforeEach(async function () {
      contract = await create()
      decimals = (contract.decimals ? await contract.decimals() : 0)

      if (options.beforeEach) {
        await options.beforeEach(contract)
      }

      contractName = await contract.name()

      signatory = owner
      delegatee = alice
      transmitter = bob
      nonce = await contract.nonces(delegatee.address)
      expiry = ethers.constants.MaxUint256

      domain = {
        name: contractName,
        chainId: owner.provider._network.chainId,
        verifyingContract: contract.address.toString()
      }

      types = {
        Delegation: [
          {name: "delegatee", type: "address"},
          {name: "nonce", type: "uint256"},
          {name: "expiry", type: "uint256"},
        ]
      }

      val = {
        'delegatee': delegatee.address.toString(),
        'nonce': nonce.toString(),
        'expiry': expiry.toString()
      }
    })

    afterEach(async function () {
      if (options.afterEach) {
        await options.afterEach(contract)
      }
      contract = null
      decimals = 0
    })

    describe('delegateBySig()', () => {
      it('should revert on invalid signature', async () => {
        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)
        sig.v = 0
        sig.r = '0xbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad0'
        sig.s = '0xbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad0'

        await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
          .to.be.revertedWith('Push::delegateBySig: invalid signature')
      })

      it('should revert on invalid nonce', async () => {
        nonce = 100
        val['nonce'] = nonce.toString()

        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)

        await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
          .to.be.revertedWith('Push::delegateBySig: invalid nonce')
      })

      it('should revert if signature has expired', async () => {
        const now = new Date()
        const secondsSinceEpoch = Math.round(now.getTime() / 1000)

        expiry = secondsSinceEpoch - 10000
        val['expiry'] = expiry.toString()

        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)

        await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
          .to.be.revertedWith('Push::delegateBySig: signature expired')
      })

      it('should delegate on behalf of signatory', async () => {
        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)

        expect(await contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
      })

      it('should emit when delegated', async () => {
        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)

        await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
          .to.emit(contract, 'DelegateChanged')
          .withArgs(owner.address, '0x0000000000000000000000000000000000000000', delegatee.address);
      })
    })

    describe('numCheckpoints()', () => {
      it('should return correctly the number of checkpoints for a delegate', async () => {
        await contract.transfer(alice.address, tokens(100))
        expect(await contract.numCheckpoints(bob.address)).to.equal(0)

        const t1 = await contract.connect(alice).delegate(bob.address)
        expect(await contract.numCheckpoints(bob.address)).to.equal(1)

        const t2 = await contract.connect(alice).transfer(charles.address, tokens(10))
        expect(await contract.numCheckpoints(bob.address)).to.equal(2)

        const t3 = await contract.connect(alice).transfer(charles.address, tokens(10))
        expect(await contract.numCheckpoints(bob.address)).to.equal(3)

        const t4 = await contract.transfer(alice.address, tokens(20))
        expect(await contract.numCheckpoints(bob.address)).to.equal(4)

        const obj1 = await contract.checkpoints(bob.address, 0)
        expect (obj1.votes).to.equal(tokens(100))
        expect (obj1.fromBlock).to.equal(t1.blockNumber)

        const obj2 = await contract.checkpoints(bob.address, 1)
        expect (obj2.votes).to.equal(tokens(90))
        expect (obj2.fromBlock).to.equal(t2.blockNumber)

        const obj3 = await contract.checkpoints(bob.address, 2)
        expect (obj3.votes).to.equal(tokens(80))
        expect (obj3.fromBlock).to.equal(t3.blockNumber)

        const obj4 = await contract.checkpoints(bob.address, 3)
        expect (obj4.votes).to.equal(tokens(100))
        expect (obj4.fromBlock).to.equal(t4.blockNumber)
      })

      // NOT SUPPORTED IN HARDHAT (MINER_STOP / MINER_START)
      // it('should not add more than one checkpoint in a block', async () => {
      //   await contract.transfer(alice.address, tokens(100))
      //   expect(await contract.numCheckpoints(bob.address)).to.equal(0)
      //
      //   ethers.provider.send("miner_stop")
      //
      //   let t1 = await contract.connect(alice).delegate(bob.address)
      //   let t2 = await contract.connect(alice).transfer(charles.address, tokens(10))
      //   let t3 = await contract.connect(alice).transfer(charles.address, tokens(10))
      //
      //   ethers.provider.send("miner_start")
      //
      //   t1 = await t1;
      //   t2 = await t2;
      //   t3 = await t3;
      //
      //   expect(await contract.numCheckpoints(bob.address)).to.equal(3)
      //
      //   const obj1 = await contract.checkpoints(bob.address, 0)
      //   expect (obj1.votes).to.equal(tokens(100))
      // })
    })

    describe('getPriorVotes()', () => {
      it('should revert if block number >= current block', async () => {
        let blockNumber = await ethers.provider.getBlockNumber()
        await expect(contract.getPriorVotes(alice.address, blockNumber + 1))
          .to.be.revertedWith('Push::getPriorVotes: not yet determined')
      })

      it('should return 0 when no checkpoints are present', async () => {
        await expect(await contract.getPriorVotes(alice.address, 0)).to.equal(0)
      })

      it('should return the latest block if >= last checkpoint block', async () => {
        const tx = await contract.connect(signatory).delegate(delegatee.address)
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 1)).to.equal('0')
        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber)).to.equal(initialSupply)
        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber + 1)).to.equal(initialSupply)
      })

      it('should return zero if < first checkpoint block', async () => {
        const tx = await contract.connect(signatory).delegate(delegatee.address)
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber)).to.equal(initialSupply)
        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 1)).to.equal('0')
        await expect(await contract.getPriorVotes(delegatee.address, tx.blockNumber - 10)).to.equal('0')
      })

      it('should return and adjust appropriate voting balance', async () => {
        const t1 = await contract.connect(signatory).delegate(delegatee.address)
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        const t2 = await contract.connect(signatory).transfer(transmitter.address, tokens(10))
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        const t3 = await contract.connect(signatory).transfer(transmitter.address, tokens(10))
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        const t4 = await contract.connect(transmitter).transfer(signatory.address, tokens(20))
        ethers.provider.send("evm_mine")
        ethers.provider.send("evm_mine")

        await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber - 1)).to.equal('0')
        await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber)).to.equal(initialSupply)
        await expect(await contract.getPriorVotes(delegatee.address, t1.blockNumber + 1)).to.equal(initialSupply)
        await expect(await contract.getPriorVotes(delegatee.address, t2.blockNumber)).to.equal(initialSupply.sub(tokens(10)))
        await expect(await contract.getPriorVotes(delegatee.address, t2.blockNumber + 1)).to.equal(initialSupply.sub(tokens(10)))
        await expect(await contract.getPriorVotes(delegatee.address, t3.blockNumber)).to.equal(initialSupply.sub(tokens(20)))
        await expect(await contract.getPriorVotes(delegatee.address, t3.blockNumber + 1)).to.equal(initialSupply.sub(tokens(20)))
        await expect(await contract.getPriorVotes(delegatee.address, t4.blockNumber)).to.equal(initialSupply)
        await expect(await contract.getPriorVotes(delegatee.address, t4.blockNumber + 1)).to.equal(initialSupply)
      })
    })
  })

})
