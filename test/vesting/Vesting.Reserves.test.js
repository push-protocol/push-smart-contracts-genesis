// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  DISTRIBUTION_INFO
} = require("../../scripts/constants");

const { tokensBN, bnToInt, vestedAmount } = require('../../helpers/utils');

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Reserves Contract tests", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token
  let token
  let owner
  let beneficiary
  let addr1
  let addrs
  let Contract
  let contract
  let amount

  const totalToken = ethers.BigNumber.from(DISTRIBUTION_INFO.total)

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    Contract = await ethers.getContractFactory("Reserves");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners();
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    token = await Token.deploy(owner.address)
    contract = await Contract.deploy(token.address, "ReservesOmega")

    amount = tokensBN(Math.floor(Math.random() * bnToInt(totalToken)))
    await token.transfer(contract.address, amount)
  })

  afterEach(async function () {
    token = null
    contract = null
  })

  it("should revert if in transfer to address receiver is zero address", async function () {
    const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

    // Random Amount between 1 and max amount transferred to contract
    const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
    const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
    const tx = contract.transferTokensToAddress(
      "0x0000000000000000000000000000000000000000",
      transferAmountBig.toString()
    )

    await expect(tx)
      .to.revertedWith("Reserves::transferTokensToAddress: receiver is zero address")
  })

  it("should revert if in transfer to address amount is zero", async function () {
    const tx = contract.transferTokensToAddress(
      addr1.address,
      ethers.BigNumber.from(0)
    )

    await expect(tx)
      .to.revertedWith("Reserves::transferTokensToAddress: amount is zero")
  })

  it("should transfer to address successfully if amount of tokens greater than balance", async function () {
    const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

    // Random Amount between 1 and max amount transferred to contract
    const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
    const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
    await contract.transferTokensToAddress(addr1.address, transferAmountBig.toString())

    const balance = await token.balanceOf(addr1.address)
    expect(balance.toString()).to.equal(transferAmountBig.toString())
  })

  it("should emit TokensTransferred when tokens are transferred to address successfully", async function () {
    const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

    // Random Amount between 1 and max amount transferred to contract
    const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
    const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
    const tx = contract.transferTokensToAddress(addr1.address, transferAmountBig.toString())

    await expect(tx)
      .to.emit(contract, 'TokensTransferred')
      .withArgs(addr1.address, transferAmountBig.toString())
  })

  it("should revert if amount of tokens to transfer to address greater than balance", async function () {
    const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()
    const balance = await token.balanceOf(contract.address)
    const balanceInt = balance.div(ethers.BigNumber.from(10).pow(18)).toNumber() + 1
    // Random Amount between balance and max amount transferred to contract
    const transferAmount = Math.floor(Math.random() * (amountInt - balanceInt + 1)) + balanceInt
    const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
    const tx = contract.transferTokensToAddress(addr1.address, transferAmountBig.toString())

    await expect(tx)
      .to.revertedWith("Reserves::transferTokensToAddress: amount greater than balance")
  })
})
