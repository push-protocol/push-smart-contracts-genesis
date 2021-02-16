// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  EPNS_ADVISORS_FUNDS_AMOUNT,
  EPNS_COMMUNITY_FUNDS_AMOUNT,
  TOTAL_EPNS_TOKENS,
} = require("../../scripts/constants");
const { vestedAmount } = require('../utils');
// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("$PUSH Token contract", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token;
  let epnsToken;
  let owner;
  let beneficiary;
  let addr1;
  let addrs;
  let start;
  let cliffDuration;
  let duration;
  let CommReservoir;
  let commReservoir;
  let totalToken = ethers.BigNumber.from(TOTAL_EPNS_TOKENS);
  let amount = ethers.BigNumber.from(EPNS_COMMUNITY_FUNDS_AMOUNT);

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    CommReservoir = await ethers.getContractFactory("CommReservoir");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners();
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    epnsToken = await Token.deploy(owner.address)
    // Run the ERC 20 Test Suite
    const now = (await ethers.provider.getBlock()).timestamp
    start = now + 60
    cliffDuration = 31536000 // 1 Year
    duration = cliffDuration + 31536000 // 2 Years
  })

  // You can nest describe calls to create subsections.
  describe("Vesting Contracts Tests", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.
    describe("CommReservoir Tests", function () {
      beforeEach(async function () {
        commReservoir = await CommReservoir.deploy(
          epnsToken.address,
          addr1.address,
          start,
          cliffDuration,
          duration,
          true
        )

        await epnsToken.transfer(commReservoir.address, amount)
      })

      it("should revert if in transfer to address receiver is zero address", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          start + cliffDuration + 7257600, // 12 Weeks
        ])
        await ethers.provider.send("evm_mine")
        const now = ethers.BigNumber.from((await ethers.provider.getBlock()).timestamp)
        const vested = vestedAmount(
          amount,
          now,
          start,
          cliffDuration,
          duration
        )

        const vestedInt = vested.div(ethers.BigNumber.from(10).pow(18)).toNumber() + 1
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

        // Random Amount between vested and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - vestedInt + 1)) + vestedInt
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        const tx = commReservoir.withdrawTokensToAddress(
          "0x0000000000000000000000000000000000000000",
          transferAmountBig.toString()
        )

        await expect(tx)
          .to.revertedWith("TokenVesting::_releaseToAddress: receiver is the zero address")
      })

      it("should revert if in transfer to address amount is zero", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          start + cliffDuration + 7257600, // 12 Weeks
        ])
        await ethers.provider.send("evm_mine")

        const tx = commReservoir.withdrawTokensToAddress(
          addr1.address,
          ethers.BigNumber.from(0)
        )

        await expect(tx)
          .to.revertedWith("TokenVesting::_releaseToAddress: amount should be greater than 0")
      })

      it("should transfer to address successfully if amount of tokens greater than releasable", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          start + cliffDuration + 7257600, // 12 Weeks
        ])
        await ethers.provider.send("evm_mine")
        const now = ethers.BigNumber.from((await ethers.provider.getBlock()).timestamp)
        const vested = vestedAmount(
          amount,
          now,
          start,
          cliffDuration,
          duration
        )
        const vestedInt = vested.div(ethers.BigNumber.from(10).pow(18)).toNumber()
        // Random Amount between 1 and currently vested tokens
        const transferAmount = Math.floor(Math.random() * (vestedInt - 1 + 1)) + 1
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        await commReservoir.withdrawTokensToAddress(addr1.address, transferAmountBig.toString())

        const balance = await epnsToken.balanceOf(addr1.address)
        expect(balance.toString()).to.equal(transferAmountBig.toString())
      })

      it("should revert if amount of tokens to transfer to address greater than releasable", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          start + cliffDuration + 7257600, // 12 Weeks
        ])
        await ethers.provider.send("evm_mine")
        const now = ethers.BigNumber.from((await ethers.provider.getBlock()).timestamp)
        const vested = vestedAmount(
          amount,
          now,
          start,
          cliffDuration,
          duration
        )

        const vestedInt = vested.div(ethers.BigNumber.from(10).pow(18)).toNumber() + 1
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

        // Random Amount between vested and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - vestedInt + 1)) + vestedInt
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        const tx = commReservoir.withdrawTokensToAddress(addr1.address, transferAmountBig.toString())

        await expect(tx)
          .to.revertedWith("TokenVesting::_releaseToAddress: enough tokens not vested yet")
      })
    })
  })
})
