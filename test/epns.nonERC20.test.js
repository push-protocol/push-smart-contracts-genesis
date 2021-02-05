// Import helper functions
const { expectRevertOrFail, bn } = require('../helpers/helpers');

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

require("@nomiclabs/hardhat-ethers");
const { getMessage } = require('eip-712');
const { TypedDataUtils } = require('ethers-eip712');

describe("$PUSH Token ERC-20 Non Standard Test Cases", function () {
  const tokenInfo = {
    // token info to test
    name: 'Ethereum Push Notification Service',
    symbol: 'PUSH',
    decimals: 18,
    supply: 100000000, // 100 Million $PUSH
  }

  const initialSupply = bn(tokenInfo.supply, 0).mul(bn(10).pow(bn(tokenInfo.decimals))); // 100 Million Tokens

  // Define configuration initial
  let initialBalances;
  let initialAllowances;
  let create;

  let Token;
  let token;
  let tokens;
  let uintMax;

  let contract;
  let decimals;

  let options;

  let owner;
  let alice;
  let bob;
  let charles;

  before(async function () {
    [owner, alice, bob, charles] = await ethers.getSigners()

    // Define Options
    options = {
      // factory method to create new token contract
      create: async function () {
      	Token = await ethers.getContractFactory("EPNS");
        return Token.deploy(owner.address);
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
    };

    // configure
    initialBalances = options.initialBalances || []
    initialAllowances = options.initialAllowances || []
    create = options.create

    // setup
    tokens = function (amount) { return bn(amount).mul(bn(10).pow(decimals)) }
    uintMax = bn(2).pow(bn(256)).sub(1)

    contract = null
    decimals = 0
  });

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

      expect(supply1.sub(tokens(10))).to.be.equal(supply2);
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
      const retries = 5;

      for (var i=0; i < retries; i++) {
        const numOfDecimals = Math.floor(Math.random() * 3);
        const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));
        const decimalShift = random / (10 ^ numOfDecimals)

        it(`should be able to burn and reflect on token supply: (${decimalShift} tokens burn => ${tokenInfo.supply - decimalShift})`, async function () {
          const supply1 = await contract.totalSupply()
          const tokenAmount = bn(random, 0).mul(bn(10).pow(bn(tokenInfo.decimals - numOfDecimals)))

          await contract.transfer(alice.address, tokenAmount)
          await contract.connect(alice).burn(tokenAmount)

          const supply2 = await contract.totalSupply()

          expect(supply1.sub(tokenAmount)).to.be.equal(supply2);
        })
      }
    })
  })

  describe('permit()', function () {
    //test later
    const DOMAIN_TYPEHASH = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')
    )

    const PERMIT_TYPEHASH = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
    )

    it('permit', async function () {
      const contractName = await contract.name();

      const spender = alice
      const transmitter = bob
      const value = 123
      const nonce = await contract.nonces(owner.address)
      const deadline = ethers.constants.MaxUint256

      const typedData = {
        types: {
          EIP712Domain: [
            {name: "name", type: "string"},
            {name: "version", type: "string"},
            {name: "chainId", type: "uint256"},
            {name: "verifyingContract", type: "address"},
          ],
          Permit: [
            {name: "owner", type: "address"},
            {name: "spender", type: "address"},
            {name: "value", type: "uint256"},
            {name: "nonce", type: "uint256"},
            {name: "deadline", type: "uint256"},
          ]
        },
        primaryType: 'Permit',
        domain: {
          name: contractName,
          version: '1',
          chainId: owner.provider._network.chainId,
          verifyingContract: contract.address.toString()
        },
        message: {
          'owner': owner.address.toString(),
          'spender': spender.address.toString(),
          'value': value,
          'nonce': nonce.toString(),
          'deadline': deadline.toString()
        }
      }

      const domain = {
        name: contractName,
        chainId: owner.provider._network.chainId,
        verifyingContract: contract.address.toString()
      }

      const types = {
        Permit: [
          {name: "owner", type: "address"},
          {name: "spender", type: "address"},
          {name: "value", type: "uint256"},
          {name: "nonce", type: "uint256"},
          {name: "deadline", type: "uint256"},
        ]
      }

      const val = {
        'owner': owner.address.toString(),
        'spender': spender.address.toString(),
        'value': value,
        'nonce': nonce.toString(),
        'deadline': deadline.toString()
      }

      const signer = ethers.provider.getSigner(0);
      const signature = await signer._signTypedData(domain, types, val)

      let sig = ethers.utils.splitSignature(signature);
      console.log(signature)
      console.log("From Tests: owner should be signatory in solidity", owner.address);

      await contract.connect(transmitter).permit(owner.address, spender.address, value, deadline, sig.v, sig.r, sig.s)

      expect(await contract.allowance(owner.address, spender.address)).to.be.equal(value)
      expect(await contract.nonces(owner.address)).to.be.equal(1)

      await contract.connect(transmitter).transferFrom(owner.address, spender.address, value)
    })
  })
})
