// Import helper functions
const { expectRevertOrFail, bn } = require('../helpers/helpers');

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

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
  let accounts;
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
    accounts = await ethers.provider.listAccounts();
    [owner, alice, bob, charles] = await ethers.getSigners();

    // Define Options
    options = {
      // factory method to create new token contract
      create: async function () {
        Token = await ethers.getContractFactory("EPNS");
        return Token.deploy(owner.address);
      },

      // factory callbacks to mint the tokens
      // use "transfer" instead of "mint" for non-mintable tokens
      mint: async function (token, to, amount) {
        return await token.transfer(to, amount, { from: accounts[0] });
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

  it(`should be able to burn own tokens`, async function () {
    await contract.transfer(alice.address, tokens(1))

    expect(await contract.connect(alice).burn(tokens(1)))
  })

  it(`should be able to reduce token supply after burn`, async function () {
    await contract.transfer(alice.address, tokens(10))
    const supply1 = await contract.totalSupply()

    await contract.connect(alice).burn(tokens(10))
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

// // Import helper functions
// const { expectRevertOrFail, bn } = require('../helpers/helpers');
//
// // We import Chai to use its asserting functions here.
// const { expect } = require("chai");
//
// // _transferTokens -> Delegate can't be moved to 0x0
//
// const DOMAIN_TYPEHASH = utils.keccak256(
//   utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')
// )
//
// const PERMIT_TYPEHASH = utils.keccak256(
//   utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
// )
//
// describe('Uni', () => {
//   const provider = new MockProvider({
//     ganacheOptions: {
//       hardfork: 'istanbul',
//       mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
//       gasLimit: 9999999,
//     },
//   })
//   const [wallet, other0, other1] = provider.getWallets()
//   const loadFixture = createFixtureLoader([wallet], provider)
//
//   let uni: Contract
//   beforeEach(async () => {
//     const fixture = await loadFixture(governanceFixture)
//     uni = fixture.uni
//   })
//
//   it('permit', async () => {
//     const domainSeparator = utils.keccak256(
//       utils.defaultAbiCoder.encode(
//         ['bytes32', 'bytes32', 'uint256', 'address'],
//         [DOMAIN_TYPEHASH, utils.keccak256(utils.toUtf8Bytes('Uniswap')), 1, uni.address]
//       )
//     )
//
//     const owner = wallet.address
//     const spender = other0.address
//     const value = 123
//     const nonce = await uni.nonces(wallet.address)
//     const deadline = constants.MaxUint256
//     const digest = utils.keccak256(
//       utils.solidityPack(
//         ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
//         [
//           '0x19',
//           '0x01',
//           domainSeparator,
//           utils.keccak256(
//             utils.defaultAbiCoder.encode(
//               ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
//               [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline]
//             )
//           ),
//         ]
//       )
//     )
//
//     const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))
//
//     await uni.permit(owner, spender, value, deadline, v, utils.hexlify(r), utils.hexlify(s))
//     expect(await uni.allowance(owner, spender)).to.eq(value)
//     expect(await uni.nonces(owner)).to.eq(1)
//
//     await uni.connect(other0).transferFrom(owner, spender, value)
//   })
//
//   it('nested delegation', async () => {
//     await uni.transfer(other0.address, expandTo18Decimals(1))
//     await uni.transfer(other1.address, expandTo18Decimals(2))
//
//     let currectVotes0 = await uni.getCurrentVotes(other0.address)
//     let currectVotes1 = await uni.getCurrentVotes(other1.address)
//     expect(currectVotes0).to.be.eq(0)
//     expect(currectVotes1).to.be.eq(0)
//
//     await uni.connect(other0).delegate(other1.address)
//     currectVotes1 = await uni.getCurrentVotes(other1.address)
//     expect(currectVotes1).to.be.eq(expandTo18Decimals(1))
//
//     await uni.connect(other1).delegate(other1.address)
//     currectVotes1 = await uni.getCurrentVotes(other1.address)
//     expect(currectVotes1).to.be.eq(expandTo18Decimals(1).add(expandTo18Decimals(2)))
//
//     await uni.connect(other1).delegate(wallet.address)
//     currectVotes1 = await uni.getCurrentVotes(other1.address)
//     expect(currectVotes1).to.be.eq(expandTo18Decimals(1))
//   })
//
//   it('mints', async () => {
//     const { timestamp: now } = await provider.getBlock('latest')
//     const uni = await deployContract(wallet, Uni, [wallet.address, wallet.address, now + 60 * 60])
//     const supply = await uni.totalSupply()
//
//     await expect(uni.mint(wallet.address, 1)).to.be.revertedWith('Uni::mint: minting not allowed yet')
//
//     let timestamp = await uni.mintingAllowedAfter()
//     await mineBlock(provider, timestamp.toString())
//
//     await expect(uni.connect(other1).mint(other1.address, 1)).to.be.revertedWith('Uni::mint: only the minter can mint')
//     await expect(uni.mint('0x0000000000000000000000000000000000000000', 1)).to.be.revertedWith('Uni::mint: cannot transfer to the zero address')
//
//     // can mint up to 2%
//     const mintCap = BigNumber.from(await uni.mintCap())
//     const amount = supply.mul(mintCap).div(100)
//     await uni.mint(wallet.address, amount)
//     expect(await uni.balanceOf(wallet.address)).to.be.eq(supply.add(amount))
//
//     timestamp = await uni.mintingAllowedAfter()
//     await mineBlock(provider, timestamp.toString())
//     // cannot mint 2.01%
//     await expect(uni.mint(wallet.address, supply.mul(mintCap.add(1)))).to.be.revertedWith('Uni::mint: exceeded mint cap')
//   })
// })
