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

      delegatee = alice
      transmitter = charles
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
        'deadline': expiry.toString()
      }
    })

    afterEach(async function () {
      if (options.afterEach) {
        await options.afterEach(contract)
      }
      contract = null
      decimals = 0
    })

    describe('delegateBySig', () => {
      it('reverts if the signatory is invalid', async () => {
        const signer = ethers.provider.getSigner(0)
        const signature = await signer._signTypedData(domain, types, val)
        let sig = ethers.utils.splitSignature(signature)

        await expect(contract.connect(transmitter).delegateBySig(delegatee.address, nonce, expiry, sig.v, sig.r, sig.s))
          .to.be.revertedWith('Push::permit: unauthorized')
      });
    })
  })

})
